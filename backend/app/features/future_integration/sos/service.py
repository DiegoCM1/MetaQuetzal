from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession


async def ensure_sos_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sos_events (
                id          BIGSERIAL PRIMARY KEY,
                user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
                lat         DOUBLE PRECISION NOT NULL,
                lon         DOUBLE PRECISION NOT NULL,
                message     VARCHAR(500),
                status      VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                resolved_at TIMESTAMPTZ
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS sos_events_status_idx ON sos_events (status, created_at DESC)"
        ))


async def create_sos(db: AsyncSession, user_id: int | None, lat: float, lon: float, message: str | None):
    result = await db.execute(
        text("""
            INSERT INTO sos_events (user_id, lat, lon, message)
            VALUES (:user_id, :lat, :lon, :message)
            RETURNING id, user_id, lat, lon, message, status, created_at, resolved_at
        """),
        {"user_id": user_id, "lat": lat, "lon": lon, "message": message},
    )
    await db.commit()
    return result.mappings().first()


async def list_sos(db: AsyncSession, status: str | None, limit: int, offset: int):
    if status:
        result = await db.execute(
            text("""
                SELECT id, user_id, lat, lon, message, status, created_at, resolved_at
                FROM sos_events WHERE status = :status
                ORDER BY created_at DESC LIMIT :limit OFFSET :offset
            """),
            {"status": status, "limit": limit, "offset": offset},
        )
    else:
        result = await db.execute(
            text("""
                SELECT id, user_id, lat, lon, message, status, created_at, resolved_at
                FROM sos_events ORDER BY created_at DESC LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": offset},
        )
    return result.mappings().all()


async def get_sos_by_id(db: AsyncSession, sos_id: int):
    result = await db.execute(
        text("SELECT * FROM sos_events WHERE id = :id LIMIT 1"),
        {"id": sos_id},
    )
    return result.mappings().first()


async def resolve_sos(db: AsyncSession, sos_id: int, status: str):
    result = await db.execute(
        text("""
            UPDATE sos_events
            SET status = :status, resolved_at = NOW()
            WHERE id = :id AND status = 'active'
            RETURNING id, user_id, lat, lon, message, status, created_at, resolved_at
        """),
        {"id": sos_id, "status": status},
    )
    await db.commit()
    return result.mappings().first()


async def list_sos_by_user(db: AsyncSession, user_id: int, limit: int, offset: int):
    result = await db.execute(
        text("""
            SELECT id, user_id, lat, lon, message, status, created_at, resolved_at
            FROM sos_events WHERE user_id = :uid
            ORDER BY created_at DESC LIMIT :limit OFFSET :offset
        """),
        {"uid": user_id, "limit": limit, "offset": offset},
    )
    return result.mappings().all()
