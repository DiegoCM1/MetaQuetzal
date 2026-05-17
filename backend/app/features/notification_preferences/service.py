from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_DEFAULTS: dict = {
    "siat_enabled": True,
    "min_siat_level": 2,
    "map_events_enabled": True,
}


async def get_preferences(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(
        text("""
            SELECT siat_enabled, min_siat_level, map_events_enabled
            FROM notification_preferences
            WHERE user_id = :user_id
        """),
        {"user_id": user_id},
    )
    row = result.mappings().first()
    if row is None:
        return dict(_DEFAULTS)
    return dict(row)


async def upsert_preferences(db: AsyncSession, user_id: int, updates: dict) -> dict:
    current = await get_preferences(db, user_id)
    merged = {**current, **updates}
    await db.execute(
        text("""
            INSERT INTO notification_preferences
                (user_id, siat_enabled, min_siat_level, map_events_enabled, updated_at)
            VALUES
                (:user_id, :siat_enabled, :min_siat_level, :map_events_enabled, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                siat_enabled       = EXCLUDED.siat_enabled,
                min_siat_level     = EXCLUDED.min_siat_level,
                map_events_enabled = EXCLUDED.map_events_enabled,
                updated_at         = NOW()
        """),
        {"user_id": user_id, **merged},
    )
    await db.commit()
    return merged
