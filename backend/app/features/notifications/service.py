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


async def _send_multicast_with_retry(
    message: messaging.MulticastMessage,
    max_attempts: int = 3,
):
    """
    Intenta un Firebase multicast hasta max_attempts veces con backoff exponencial (1s, 2s).
    Re-lanza la última excepción si todas las tentativas fallan.
    """
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

    invalid_tokens = [tokens[i] for i, r in enumerate(response.responses) if not r.success]
    if invalid_tokens:
        # Se loguea ANTES de borrar: el borrado destruye la evidencia. Si aquí sale
        # ThirdPartyAuthError o QuotaExceededError, el token estaba bien y lo estamos
        # tirando por un problema nuestro (ver E).
        logger.warning(
            "send_targeted_notification borrando %d token(s) — causas: %s",
            len(invalid_tokens), summarize_push_failures(response),
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

    # Cleaning up missing/bad tokens
    invalid_tokens = []
    for i, r in enumerate(response.responses):
        if not r.success:
            invalid_tokens.append(tokens[i])
    
    if invalid_tokens:
        # Mismo razonamiento que en send_targeted_notification: loguear antes de borrar.
        logger.warning(
            "send_all_notifications borrando %d token(s) — causas: %s",
            len(invalid_tokens), summarize_push_failures(response),
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