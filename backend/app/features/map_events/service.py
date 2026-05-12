import math
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.map_events.schemas import MapEventCreate, MapEventUpdate

DEFAULT_RADIUS_KM = 100


def distance_in_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


async def ensure_map_events_table(db: AsyncSession) -> None:
    await db.execute(text('CREATE EXTENSION IF NOT EXISTS "pgcrypto"'))

    result = await db.execute(
        text(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'map_events'
            """
        )
    )
    columns = {row.column_name: row.data_type for row in result.fetchall()}
    is_legacy_table = bool(columns) and (
        columns.get("id") != "uuid"
        or columns.get("user_id") != "bigint"
        or "lat" not in columns
        or "lon" not in columns
    )

    if is_legacy_table:
        backup_name = f"map_events_legacy_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        await db.execute(text(f'ALTER TABLE map_events RENAME TO {backup_name}'))

    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS map_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id BIGINT NULL,
                type VARCHAR(20) NOT NULL CHECK (type IN ('natural', 'vial', 'peligro', 'ayuda')),
                description TEXT NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
    )
    await db.commit()


async def list_map_events(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_km: float = DEFAULT_RADIUS_KM,
):
    await ensure_map_events_table(db)
    result = await db.execute(
        text(
            """
            SELECT id, user_id, type, description, lat, lon, created_at, updated_at
            FROM map_events
            ORDER BY created_at DESC
            """
        )
    )

    rows = [dict(row._mapping) for row in result.fetchall()]
    return [
        row
        for row in rows
        if distance_in_km(lat, lon, float(row["lat"]), float(row["lon"])) <= radius_km
    ]


async def create_map_event(db: AsyncSession, payload: MapEventCreate, user_id: int | None):
    await ensure_map_events_table(db)

    result = await db.execute(
        text(
            """
            INSERT INTO map_events (user_id, type, description, lat, lon)
            VALUES (:user_id, :type, :description, :lat, :lon)
            RETURNING id, user_id, type, description, lat, lon, created_at, updated_at
            """
        ),
        {
            "user_id": user_id,
            "type": payload.type,
            "description": payload.description.strip(),
            "lat": payload.lat,
            "lon": payload.lon,
        },
    )
    await db.commit()
    row = result.fetchone()
    return dict(row._mapping)


async def update_map_event(
    db: AsyncSession,
    event_id: UUID,
    payload: MapEventUpdate,
    user_id: int | None,
):
    await ensure_map_events_table(db)
    result = await db.execute(
        text(
            """
            UPDATE map_events
            SET description = :description, updated_at = NOW()
            WHERE id = :id AND user_id = :user_id
            RETURNING id, user_id, type, description, lat, lon, created_at, updated_at
            """
        ),
        {
            "id": str(event_id),
            "user_id": user_id,
            "description": payload.description.strip(),
        },
    )
    await db.commit()
    row = result.fetchone()

    if row:
        return dict(row._mapping)

    owner_check = await db.execute(
        text("SELECT user_id FROM map_events WHERE id = :id"),
        {"id": str(event_id)},
    )
    owner_row = owner_check.fetchone()
    if not owner_row:
        raise HTTPException(status_code=404, detail="Map event not found")

    raise HTTPException(status_code=403, detail="Map event does not belong to the authenticated user")


async def delete_map_event(
    db: AsyncSession,
    event_id: UUID,
    user_id: int | None,
) -> None:
    await ensure_map_events_table(db)
    result = await db.execute(
        text(
            """
            DELETE FROM map_events
            WHERE id = :id AND user_id = :user_id
            RETURNING id
            """
        ),
        {"id": str(event_id), "user_id": user_id},
    )
    await db.commit()

    if result.fetchone():
        return

    owner_check = await db.execute(
        text("SELECT user_id FROM map_events WHERE id = :id"),
        {"id": str(event_id)},
    )
    owner_row = owner_check.fetchone()
    if not owner_row:
        raise HTTPException(status_code=404, detail="Map event not found")

    raise HTTPException(status_code=403, detail="Map event does not belong to the authenticated user")
