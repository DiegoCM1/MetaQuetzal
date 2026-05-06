from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_user_by_firebase_uid(db: AsyncSession, firebase_uid: str) -> dict | None:
    result = await db.execute(
        text("SELECT * FROM users WHERE firebase_uid = :uid LIMIT 1"),
        {"uid": firebase_uid},
    )
    return result.mappings().first()


async def upsert_user(db: AsyncSession, firebase_uid: str) -> dict:
    """Create user profile if not exists, return the user row."""
    result = await db.execute(
        text("""
            INSERT INTO users (firebase_uid)
            VALUES (:uid)
            ON CONFLICT (firebase_uid) DO UPDATE SET updated_at = NOW()
            RETURNING id, firebase_uid, lat, lon, created_at, updated_at
        """),
        {"uid": firebase_uid},
    )
    await db.commit()
    return result.mappings().first()


async def update_user_location(db: AsyncSession, firebase_uid: str, lat: float, lon: float) -> dict | None:
    result = await db.execute(
        text("""
            UPDATE users SET lat = :lat, lon = :lon, updated_at = NOW()
            WHERE firebase_uid = :uid
            RETURNING id, firebase_uid, lat, lon, created_at, updated_at
        """),
        {"uid": firebase_uid, "lat": lat, "lon": lon},
    )
    await db.commit()
    return result.mappings().first()
