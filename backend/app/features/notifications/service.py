import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from firebase_admin import messaging

logger = logging.getLogger(__name__)

# iOS no tiene canales de notificación. Todo lo que en Android se configura **una vez**
# en el cliente (importancia, sonido, si puede saltarse el No Molestar) en iOS es
# propiedad de *cada* mensaje y lo tiene que repetir el servidor en cada send. Sin un
# bloque `apns=`, FCM manda los defaults: sin sonido y sin permiso para interrumpir.
#
# Todo send visible nuevo debe pasar por este helper en vez de armar su propio
# APNSConfig — así el comportamiento en iOS queda en un solo lugar.
def build_apns_config(
    *,
    sound: str = "default",
    interruption_level: str | None = None,
    priority: str = "10",
) -> messaging.APNSConfig:
    """Overrides de APNs para una notificación visible.

    `interruption_level="time-sensitive"` es lo único que permite atravesar los Focus
    modes de iOS 15+ (Sueño, No Molestar, Conduciendo). Sin eso, una alerta de huracán
    a las 3am se retiene hasta que el usuario desbloquee — justo el escenario para el
    que existe la app. `Aps` no tiene campo para esto, así que viaja en `custom_data`,
    que firebase-admin mezcla tal cual dentro del dict `aps`.

    ("critical" interrumpe incluso en silencio, pero requiere un entitlement especial
    que Apple aprueba caso por caso. "time-sensitive" no requiere nada.)
    """
    return messaging.APNSConfig(
        headers={"apns-priority": priority},
        payload=messaging.APNSPayload(
            aps=messaging.Aps(
                sound=sound,
                custom_data=(
                    {"interruption-level": interruption_level}
                    if interruption_level
                    else None
                ),
            ),
        ),
    )


def summarize_push_failures(response) -> dict[str, int]:
    """Agrupa los fallos por tipo de excepción de FCM: `{"UnregisteredError": 3}`.

    Cada tipo tiene una causa y un arreglo distintos, y **ninguno se veía** antes de
    esto: los call sites hacían `if not r.success` y tiraban `r.exception` a la basura.

    - `UnregisteredError`   — el token está muerto. Borrarlo es correcto.
    - `ThirdPartyAuthError` — **la auth key de APNs es inválida o falta.** Este es el
      error de "el slot de Production en Firebase está mal". Es el que más importa en
      el primer TestFlight de iOS, y es justo el que hoy se pierde.
    - `SenderIdMismatchError` — el token es de otro proyecto de Firebase.
    - `QuotaExceededError`  — transitorio. Borrar el token aquí es un bug (ver E).

    Loguear esto en vez de los tokens también quita una fuga: un push token es una
    credencial (quien la tiene le puede mandar notificaciones a ese aparato), y el
    cliente ya la redacta con `redactToken()` mientras el backend la escribía completa.
    """
    counts: dict[str, int] = {}
    for r in response.responses:
        if not r.success:
            name = type(r.exception).__name__ if r.exception else "UnknownError"
            counts[name] = counts.get(name, 0) + 1
    return counts


_PERMANENT_FAILURE_TYPES = frozenset({"UnregisteredError"})


def dead_tokens(tokens: list[str], response) -> list[str]:
    """Los tokens que hay que borrar: SOLO los que fallaron de forma permanente.

    Antes esto era `if not r.success`, o sea que **cualquier** fallo borraba el token.
    Los fallos por token son de dos clases opuestas:

    - Permanente (`UnregisteredError`): la app se desinstaló, el token está muerto para
      siempre. Borrarlo es correcto y necesario.
    - Transitorio (`QuotaExceededError`, fallos de red) o de configuración
      (`ThirdPartyAuthError`): **el aparato está perfectamente bien**, lo que falló fue
      el envío. Borrarlo destruye un registro bueno.

    Por qué importa justo ahora: `ThirdPartyAuthError` significa literalmente "la auth key
    de APNs es inválida o falta", y llega **por token**. O sea que en cuanto entren tokens
    de iOS con cualquier problema de aprovisionamiento, el predicado viejo respondía
    borrando justo los aparatos que uno está tratando de depurar: se registran, fallan, se
    borran, se re-registran, en bucle y sin dejar rastro (el borrado destruye la evidencia).

    `SenderIdMismatchError` tampoco borra a propósito: es permanente para nosotros, pero
    señala que el cliente está apuntando a otro proyecto de Firebase — un problema de
    configuración que hay que ver, no un aparato que se fue.

    **Por qué se compara por nombre de clase y no con `isinstance`:** `conftest.py`
    sustituye `firebase_admin` por un `MagicMock` (para importar `app.main` sin
    credenciales reales, y CLAUDE.md dice explícitamente que no se quite). Bajo pytest,
    `messaging.UnregisteredError` no es una clase sino un atributo del mock, así que
    `isinstance` revienta con `TypeError: isinstance() arg 2 must be a type`. Sería código
    imposible de probar. `summarize_push_failures`, aquí arriba, ya identifica los fallos
    con `type(r.exception).__name__` — o sea que el módulo ya había elegido este camino.
    """
    return [
        tokens[i]
        for i, r in enumerate(response.responses)
        if not r.success and type(r.exception).__name__ in _PERMANENT_FAILURE_TYPES
    ]


# Límite duro del SDK, no nuestro: firebase_admin/messaging.py:435 hace
# `if len(messages) > 500: raise ValueError(...)` **antes de cualquier llamada de red**.
# Por eso pasarse no da error de Firebase ni status HTTP: es un ValueError del lado del
# cliente que se traga cualquier `except Exception` y deja el envío en silencio total.
FCM_MULTICAST_LIMIT = 500


def _rebuild_with_tokens(
    message: messaging.MulticastMessage, tokens: list[str]
) -> messaging.MulticastMessage:
    """Clona un MulticastMessage cambiándole solo los tokens.

    Se copian todos los campos a mano porque `MulticastMessage` no tiene copy(): si
    alguien le agrega un campo nuevo al SDK y no se agrega aquí, se pierde en silencio
    **solo cuando hay chunking** — o sea, solo con mucha carga y nunca en pruebas.
    """
    return messaging.MulticastMessage(
        data=message.data,
        notification=message.notification,
        android=message.android,
        webpush=message.webpush,
        apns=message.apns,
        fcm_options=message.fcm_options,
        tokens=tokens,
    )


async def _send_chunk_with_retry(
    message: messaging.MulticastMessage,
    max_attempts: int = 3,
):
    """Un solo chunk (≤500), con backoff exponencial. Re-lanza si todo falla."""
    last_exc: Exception | None = None
    for attempt in range(max_attempts):
        try:
            return await asyncio.to_thread(messaging.send_each_for_multicast, message)
        except Exception as exc:
            last_exc = exc
            logger.warning("Firebase multicast attempt %d/%d failed: %s", attempt + 1, max_attempts, exc)
            if attempt < max_attempts - 1:
                await asyncio.sleep(2 ** attempt)  # 1s → 2s between retries
    raise last_exc  # max_attempts >= 1 garantiza que last_exc está asignado


async def _send_multicast_with_retry(
    message: messaging.MulticastMessage,
    max_attempts: int = 3,
):
    """Manda un multicast partiéndolo en chunks de 500 y devuelve UNA sola respuesta.

    **Todo send tiene que pasar por aquí.** Llamar a `messaging.send_each_for_multicast`
    directo se salta esta cota — que es exactamente cómo los dos sends de SIAT quedaron
    sin acotar mientras el helper "ya lo resolvía".

    El orden de `responses` corresponde índice por índice con `message.tokens`, igual que
    en una llamada sin partir. **Eso es carga estructural, no un detalle:** los call sites
    hacen `tokens[i]` para saber qué token falló, así que reordenar aquí haría que se
    borrara el token equivocado.

    Si un chunk falla después de sus reintentos, se propaga la excepción y se pierden los
    resultados de los chunks previos. Es a propósito: sin respuesta completa no se puede
    decidir qué borrar, y fallar hacia "no borrar nada" es el lado seguro.
    """
    tokens = list(message.tokens or [])

    if len(tokens) <= FCM_MULTICAST_LIMIT:
        return await _send_chunk_with_retry(message, max_attempts)

    chunks = range(0, len(tokens), FCM_MULTICAST_LIMIT)
    total_chunks = len(chunks)
    logger.info(
        "Multicast de %d tokens → %d chunks de hasta %d",
        len(tokens), total_chunks, FCM_MULTICAST_LIMIT,
    )

    responses = []
    for n, start in enumerate(chunks, start=1):
        chunk = tokens[start:start + FCM_MULTICAST_LIMIT]
        try:
            chunk_response = await _send_chunk_with_retry(
                _rebuild_with_tokens(message, chunk), max_attempts
            )
        except Exception:
            logger.error(
                "Multicast falló en el chunk %d/%d (tokens %d-%d); "
                "se descartan los %d resultados previos",
                n, total_chunks, start, start + len(chunk) - 1, len(responses),
            )
            raise
        responses.extend(chunk_response.responses)

    return messaging.BatchResponse(responses)


async def push_token(
    db: AsyncSession, token: str, user_id: int, platform: str | None = None
) -> None:
    # COALESCE en el UPDATE: si un cliente viejo (sin plataforma) re-registra un token
    # que ya estaba clasificado, no lo queremos volver a poner en NULL.
    await db.execute(
        text("""
            INSERT INTO device_tokens (token, user_id, platform)
            VALUES (:token, :user_id, :platform)
            ON CONFLICT (token)
            DO UPDATE SET
                user_id    = :user_id,
                platform   = COALESCE(:platform, device_tokens.platform),
                updated_at = NOW()
        """),
        {"token": token, "user_id": user_id, "platform": platform},
    )
    await db.commit()


async def get_tokens_for_users(db: AsyncSession, user_ids: list[int]) -> dict[int, list[str]]:
    """Returns {user_id: [token, ...]} for the given user IDs."""
    if not user_ids:
        return {}
    # asyncpg accepts Python lists natively as PostgreSQL arrays — no CAST needed
    result = await db.execute(
        text("SELECT user_id, token FROM device_tokens WHERE user_id = ANY(:ids)"),
        {"ids": user_ids},
    )
    token_map: dict[int, list[str]] = {}
    for row in result.mappings():
        token_map.setdefault(row["user_id"], []).append(row["token"])
    return token_map



async def send_targeted_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    body: str,
    data: dict[str, str],
    android_channel_id: str | None = None,
):
    """Send a push notification only to the tokens belonging to a specific user."""
    from fastapi import HTTPException  # local import avoids circular on module load

    token_map = await get_tokens_for_users(db, [user_id])
    tokens = token_map.get(user_id, [])
    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens registered for this user")

    android_config = messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(channel_id=android_channel_id) if android_channel_id else None,
    )
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        android=android_config,
        apns=build_apns_config(),
        tokens=tokens,
    )
    try:
        response = await _send_multicast_with_retry(message)
    except Exception as exc:
        logger.error("send_targeted_notification Firebase failed after retries: %s", exc, exc_info=True)
        raise

    # Se loguean TODOS los fallos, pero solo se borran los permanentes. El resumen va
    # antes del borrado a propósito: el borrado destruye la evidencia.
    if response.failure_count:
        logger.warning(
            "send_targeted_notification fallos: %s", summarize_push_failures(response),
        )
    invalid_tokens = dead_tokens(tokens, response)
    if invalid_tokens:
        logger.warning(
            "send_targeted_notification borrando %d token(s) muertos de %d fallo(s)",
            len(invalid_tokens), response.failure_count,
        )
        await db.execute(
            text("DELETE FROM device_tokens WHERE token = ANY(:tokens)"),
            {"tokens": invalid_tokens},
        )
        await db.commit()

    return {"success_count": response.success_count, "failure_count": response.failure_count}


async def send_contacts_refresh_push(db: AsyncSession, user_ids: list[int]) -> None:
    """Send a silent push so the recipients' contacts screen refreshes instantly."""
    token_map = await get_tokens_for_users(db, user_ids)
    tokens = [t for uid in user_ids for t in token_map.get(uid, [])]
    if not tokens:
        return
    msg = messaging.MulticastMessage(
        notification=messaging.Notification(title=" ", body=" "),
        data={"type": "contacts_refresh"},
        android=messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(channel_id="contacts_refresh_silent"),
        ),
        tokens=tokens,
    )
    try:
        response = await _send_multicast_with_retry(msg)
        logger.info(
            "contacts_refresh push → user_ids=%s tokens=%d success=%d",
            user_ids, len(tokens), response.success_count,
        )
    except Exception as exc:
        logger.error("contacts_refresh push failed: %s", exc)


async def send_all_notifications(db: AsyncSession, title:str, body:str, data:dict[str, str]):
    # Query to db to get all tokens
    result = await db.execute(text("SELECT token FROM device_tokens"))
    rows = result.mappings().all()
    tokens = []
    for row in rows:
        tokens.append(row["token"])

    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens registered")


    # Sending a notification to all of the tokens.
    # Sin interruption-level a propósito: este es el camino de campaña/broadcast, y
    # Apple reserva "time-sensitive" para información urgente. Marcar marketing así
    # es abuso del flag y lo puede penalizar.
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        apns=build_apns_config(),
        tokens=tokens,
    )
    try:
        response = await _send_multicast_with_retry(message)
    except Exception as exc:
        logger.error("send_all_notifications Firebase failed after retries: %s", exc, exc_info=True)
        raise

    # Cleaning up missing/bad tokens — solo los permanentes (ver dead_tokens).
    if response.failure_count:
        logger.warning(
            "send_all_notifications fallos: %s", summarize_push_failures(response),
        )
    invalid_tokens = dead_tokens(tokens, response)

    if invalid_tokens:
        logger.warning(
            "send_all_notifications borrando %d token(s) muertos de %d fallo(s)",
            len(invalid_tokens), response.failure_count,
        )
        await db.execute(
            text("DELETE FROM device_tokens WHERE token = ANY(:tokens)"),
            {"tokens": invalid_tokens},
        )

        await db.commit()

    return {
        "success_count": response.success_count,
        "failure_count": response.failure_count
    }