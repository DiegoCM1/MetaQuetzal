import asyncio
import logging

from fastapi import HTTPException
from firebase_admin import messaging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.notifications.service import get_tokens_for_users

logger = logging.getLogger(__name__)

_RATE_LIMIT_MAX = 3
_RATE_LIMIT_WINDOW = "10 minutes"


async def trigger_sos(
    db: AsyncSession,
    sender_id: int,
    sender_display_name: str,
    lat: float | None,
    lon: float | None,
) -> dict:
    # 1. Rate limit: max 3 triggers per 10 minutes
    count_row = await db.execute(
        text(f"""
            SELECT COUNT(*) FROM sos_events
            WHERE sender_id = :sender_id
              AND created_at > NOW() - INTERVAL '{_RATE_LIMIT_WINDOW}'
        """),
        {"sender_id": sender_id},
    )
    if count_row.scalar() >= _RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Demasiadas alertas SOS. Espera unos minutos antes de enviar otra.",
            headers={"Retry-After": "600"},
        )

    # 2. Linked contacts
    contacts_result = await db.execute(
        text("""
            SELECT linked_user_id FROM sos_contacts
            WHERE user_id = :sender_id
              AND link_status = 'linked'
              AND linked_user_id IS NOT NULL
        """),
        {"sender_id": sender_id},
    )
    linked_user_ids: list[int] = [int(row[0]) for row in contacts_result.fetchall()]

    notified_count = 0
    skipped_count = 0

    if linked_user_ids:
        # 3. Device tokens
        token_map = await get_tokens_for_users(db, linked_user_ids)
        all_tokens = [t for tokens in token_map.values() for t in tokens]
        skipped_count = len([uid for uid in linked_user_ids if uid not in token_map])

        # 4. Firebase push
        if all_tokens:
            display_name = sender_display_name or "Un usuario de BluEye"
            msg = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=f"🆘 SOS — {display_name}",
                    body="Necesita ayuda urgente. Toca para ver su ubicación.",
                ),
                data={
                    "category":    "sos",
                    "sender_name": display_name,
                    "lat":         str(lat) if lat is not None else "",
                    "lon":         str(lon) if lon is not None else "",
                },
                tokens=all_tokens,
            )
            try:
                response = await asyncio.to_thread(messaging.send_each_for_multicast, msg)
                notified_count = response.success_count
                logger.info(
                    "SOS push → sender_id=%d contacts=%d tokens=%d success=%d failure=%d",
                    sender_id, len(linked_user_ids), len(all_tokens),
                    response.success_count, response.failure_count,
                )
                if response.failure_count:
                    failed = [all_tokens[i] for i, r in enumerate(response.responses) if not r.success]
                    logger.warning("SOS push failures sender_id=%d: %s", sender_id, failed[:5])
            except Exception as exc:
                logger.error("SOS Firebase push failed sender_id=%d: %s", sender_id, exc, exc_info=True)

    # 5. Log event (always — rate limit applies even to failed pushes)
    event_result = await db.execute(
        text("""
            INSERT INTO sos_events (sender_id, lat, lon, notified_count)
            VALUES (:sender_id, :lat, :lon, :notified_count)
            RETURNING id
        """),
        {
            "sender_id": sender_id,
            "lat": lat,
            "lon": lon,
            "notified_count": notified_count,
        },
    )
    await db.commit()
    sos_event_id = int(event_result.scalar())

    return {
        "notified_count": notified_count,
        "skipped_count":  skipped_count,
        "sos_event_id":   sos_event_id,
    }
