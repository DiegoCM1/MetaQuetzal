"""
Account-deletion cascade guard (Guideline 5.1.1(v)).

The bug class this exists to catch: borrar una cuenta es un solo `DELETE FROM
users`, pero lo que realmente pasa lo decide el grafo de foreign keys, no el
código. Una FK sin regla de borrado (el default de Postgres es NO ACTION) hace
que el DELETE **falle** para los usuarios que tienen filas dependientes — y pase
sin problema para una cuenta recién creada, que es exactamente la que uno usa
para probar a mano. Así se escapó `sos_events.sender_id`: reventaba solo para
usuarios que alguna vez habían mandado un SOS.

Por eso la prueba no borra "un usuario": borra un usuario **con historial en cada
tabla que lo referencia**, y además comprueba que los datos de OTRO usuario
sobreviven intactos. Un CASCADE de más es tan grave como uno de menos — se
llevaría la lista de contactos de alguien más.

Contrato de mantenimiento: si agregas una tabla con `REFERENCES users(id)` en
`ensure_core_tables` (app/main.py), agrégala aquí. Si no, su regla de borrado
nunca se prueba.

Corre contra el Postgres que CI ya levanta (DATABASE_URL). Sin DB alcanzable
hace skip, igual que app/tests/test_schema_completeness.py — su trabajo es
blindar CI, no obligar a cada dev a tener una base viva.
"""
import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.main import ensure_core_tables
from app.features.siat.service import ensure_siat_tables


async def _engine():
    # Engine aparte (no app.core.database.engine) porque ese fuerza ssl=require
    # para Neon, que el Postgres pelón de CI no habla.
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        await engine.dispose()
        pytest.skip(f"no database reachable for cascade check: {exc}")
    return engine


async def _run_cascade_scenario() -> dict:
    engine = await _engine()
    tag = uuid.uuid4().hex[:12]
    victim_uid = f"cascade-victim-{tag}"
    bystander_uid = f"cascade-bystander-{tag}"

    try:
        await ensure_core_tables(engine)
        await ensure_siat_tables(engine)

        async with engine.begin() as conn:
            # --- dos usuarios: uno se borra, el otro NO debe perder nada ---
            victim = (await conn.execute(
                text("INSERT INTO users (firebase_uid) VALUES (:uid) RETURNING id"),
                {"uid": victim_uid},
            )).scalar_one()
            bystander = (await conn.execute(
                text("INSERT INTO users (firebase_uid) VALUES (:uid) RETURNING id"),
                {"uid": bystander_uid},
            )).scalar_one()

            # --- filas que DEBEN desaparecer con la cuenta (CASCADE) ---
            await conn.execute(
                text("INSERT INTO device_tokens (token, user_id) VALUES (:t, :u)"),
                {"t": f"tok-{tag}", "u": victim},
            )
            await conn.execute(
                text("INSERT INTO notification_preferences (user_id) VALUES (:u)"),
                {"u": victim},
            )
            victim_contact = (await conn.execute(
                text("""INSERT INTO sos_contacts (user_id, name, phone)
                        VALUES (:u, 'Contacto del victim', '5550000001') RETURNING id"""),
                {"u": victim},
            )).scalar_one()
            await conn.execute(
                text("""INSERT INTO sos_invitations (token, inviter_id, contact_id, contact_name)
                        VALUES (:t, :u, :c, 'Contacto del victim')"""),
                {"t": f"inv-victim-{tag}", "u": victim, "c": victim_contact},
            )
            # La FK que estaba rota: sin ON DELETE CASCADE esto hacía fallar el
            # DELETE entero con violación de FK.
            await conn.execute(
                text("""INSERT INTO sos_events (sender_id, lat, lon)
                        VALUES (:u, 19.4326, -99.1332)"""),
                {"u": victim},
            )

            # --- filas que DEBEN sobrevivir con el user_id en NULL (SET NULL) ---
            # La descripción lleva el tag porque esta fila es la única que
            # SOBREVIVE al borrado del usuario (SET NULL), así que limpiar los
            # usuarios al final no se la lleva. Sin una marca propia, cada corrida
            # deja un map_event huérfano acumulándose en la DB.
            victim_event = (await conn.execute(
                text("""INSERT INTO map_events (user_id, type, description, lat, lon)
                        VALUES (:u, 'natural', :d, 19.4, -99.1)
                        RETURNING id"""),
                {"u": victim, "d": f"cascade-test-{tag}"},
            )).scalar_one()

            # --- datos del BYSTANDER que apuntan al victim: no se los puede llevar ---
            bystander_contact = (await conn.execute(
                text("""INSERT INTO sos_contacts (user_id, name, phone, linked_user_id, link_status)
                        VALUES (:b, 'Victim como contacto', '5550000002', :v, 'linked')
                        RETURNING id"""),
                {"b": bystander, "v": victim},
            )).scalar_one()
            await conn.execute(
                text("""INSERT INTO sos_invitations
                            (token, inviter_id, contact_id, contact_name, accepted_user_id, accepted_at)
                        VALUES (:t, :b, :c, 'Victim como contacto', :v, NOW())"""),
                {"t": f"inv-bystander-{tag}", "b": bystander, "c": bystander_contact, "v": victim},
            )

        # --- el borrado real, tal cual lo hace delete_user_by_firebase_uid ---
        async with engine.begin() as conn:
            deleted = (await conn.execute(
                text("DELETE FROM users WHERE firebase_uid = :uid RETURNING id"),
                {"uid": victim_uid},
            )).first()

        async with engine.connect() as conn:
            async def count(sql: str, **params) -> int:
                return (await conn.execute(text(sql), params)).scalar_one()

            return {
                "deleted": deleted is not None,
                "device_tokens": await count(
                    "SELECT COUNT(*) FROM device_tokens WHERE user_id = :u", u=victim),
                "notification_preferences": await count(
                    "SELECT COUNT(*) FROM notification_preferences WHERE user_id = :u", u=victim),
                "sos_contacts": await count(
                    "SELECT COUNT(*) FROM sos_contacts WHERE user_id = :u", u=victim),
                "sos_invitations": await count(
                    "SELECT COUNT(*) FROM sos_invitations WHERE inviter_id = :u", u=victim),
                "sos_events": await count(
                    "SELECT COUNT(*) FROM sos_events WHERE sender_id = :u", u=victim),
                "map_event_survives": await count(
                    "SELECT COUNT(*) FROM map_events WHERE id = :i", i=victim_event),
                "map_event_user_id_nulled": await count(
                    "SELECT COUNT(*) FROM map_events WHERE id = :i AND user_id IS NULL",
                    i=victim_event),
                "bystander_survives": await count(
                    "SELECT COUNT(*) FROM users WHERE id = :b", b=bystander),
                "bystander_contact_survives": await count(
                    "SELECT COUNT(*) FROM sos_contacts WHERE id = :c", c=bystander_contact),
                "bystander_contact_unlinked": await count(
                    "SELECT COUNT(*) FROM sos_contacts WHERE id = :c AND linked_user_id IS NULL",
                    c=bystander_contact),
                "bystander_invitation_survives": await count(
                    "SELECT COUNT(*) FROM sos_invitations WHERE token = :t",
                    t=f"inv-bystander-{tag}"),
                "bystander_invitation_unlinked": await count(
                    "SELECT COUNT(*) FROM sos_invitations "
                    "WHERE token = :t AND accepted_user_id IS NULL",
                    t=f"inv-bystander-{tag}"),
            }
    finally:
        # El bystander no se borra solo; sin esto cada corrida deja basura en la DB
        # de CI. Su propio DELETE arrastra en cascada lo que le cuelga.
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text("DELETE FROM users WHERE firebase_uid IN (:v, :b)"),
                    {"v": victim_uid, "b": bystander_uid},
                )
                # El map_event ya quedó huérfano (user_id NULL) a propósito, así que
                # borrar los usuarios NO se lo lleva. Hay que borrarlo por su marca.
                await conn.execute(
                    text("DELETE FROM map_events WHERE description = :d"),
                    {"d": f"cascade-test-{tag}"},
                )
        finally:
            await engine.dispose()


def test_deleting_a_user_with_full_history_cascades_correctly():
    r = asyncio.run(_run_cascade_scenario())

    # Que el DELETE ni siquiera falle ya es el 90% del valor: con la FK sin
    # ON DELETE, sos_events lo tumbaba con IntegrityError.
    assert r["deleted"], "DELETE FROM users no borró la fila del usuario"

    # Lo que se va con la cuenta. Los push tokens son LOS que importan para
    # 5.1.1(v): si sobreviven, una cuenta borrada sigue recibiendo alertas.
    for table in (
        "device_tokens",
        "notification_preferences",
        "sos_contacts",
        "sos_invitations",
        "sos_events",
    ):
        assert r[table] == 0, (
            f"{table} conservó filas del usuario borrado: la FK a users(id) "
            f"necesita ON DELETE CASCADE"
        )

    # Lo que sobrevive anonimizado: un reporte en el mapa es información
    # comunitaria de seguridad, no deja de ser cierto porque el autor se dio de baja.
    assert r["map_event_survives"] == 1, "map_events se borró; debería ser ON DELETE SET NULL"
    assert r["map_event_user_id_nulled"] == 1, "map_events.user_id quedó apuntando a un usuario borrado"

    # Y lo más importante: borrar a alguien no puede dañar la cuenta de otro.
    assert r["bystander_survives"] == 1, "borrar un usuario se llevó a otro usuario"
    assert r["bystander_contact_survives"] == 1, (
        "borrar un usuario borró un contacto SOS de OTRA persona; "
        "sos_contacts.linked_user_id debe ser ON DELETE SET NULL, no CASCADE"
    )
    assert r["bystander_contact_unlinked"] == 1, "linked_user_id quedó apuntando a un usuario borrado"
    assert r["bystander_invitation_survives"] == 1, (
        "borrar un usuario borró una invitación de OTRA persona; "
        "sos_invitations.accepted_user_id debe ser ON DELETE SET NULL"
    )
    assert r["bystander_invitation_unlinked"] == 1, "accepted_user_id quedó apuntando a un usuario borrado"
