import asyncio
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from firebase_admin import messaging

logger = logging.getLogger(__name__)


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


async def push_token(db: AsyncSession, token: str, user_id: int) -> None:
    await db.execute(
        text("""
            INSERT INTO device_tokens (token, user_id)
            VALUES (:token, :user_id)
            ON CONFLICT (token)
            DO UPDATE SET user_id = :user_id, updated_at = NOW()
        """),
        {"token": token, "user_id": user_id},
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



async def send_all_notifications(db: AsyncSession, title:str, body:str, data:dict[str, str]):
    # Query to db to get all tokens
    result = await db.execute(text("SELECT token FROM device_tokens"))
    rows = result.mappings().all()
    tokens = []
    for row in rows:
        tokens.append(row["token"])

    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens registered")


    # Sending a notification to all of the tokens
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
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
        await db.execute(
            text("DELETE FROM device_tokens WHERE token = ANY(:tokens)"),
            {"tokens": invalid_tokens},
        )
        
        await db.commit()

    return {
        "success_count": response.success_count,
        "failure_count": response.failure_count
    }