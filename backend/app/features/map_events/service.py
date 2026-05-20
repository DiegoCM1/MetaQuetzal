import math
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.map_events.schemas import MapEventCreate, MapEventUpdate

DEFAULT_RADIUS_KM = 100
MAP_EVENT_HIDE_DOWNVOTES = 3


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
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS map_event_votes (
                event_id UUID NOT NULL REFERENCES map_events(id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL,
                value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (event_id, user_id)
            )
            """
        )
    )
    await db.commit()


async def get_map_event_with_votes(
    db: AsyncSession,
    event_id: str,
    current_user_id: int | None,
):
    result = await db.execute(
        text(
            """
            SELECT
                e.id,
                e.user_id,
                e.type,
                e.description,
                e.lat,
                e.lon,
                e.created_at,
                e.updated_at,
                COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
                MAX(CASE WHEN v.user_id = :current_user_id THEN v.value END) AS user_vote
            FROM map_events e
            LEFT JOIN map_event_votes v ON v.event_id = e.id
            WHERE e.id = :event_id
            GROUP BY e.id
            """
        ),
        {"event_id": event_id, "current_user_id": current_user_id},
    )
    row = result.fetchone()
    if not row:
        return None

    event = dict(row._mapping)
    event["is_owner"] = current_user_id is not None and event["user_id"] == current_user_id
    return event


async def list_map_events(
    db: AsyncSession,
    lat: float,
    lon: float,
    radius_km: float = DEFAULT_RADIUS_KM,
    current_user_id: int | None = None,
):
    await ensure_map_events_table(db)
    result = await db.execute(
        text(
            """
            SELECT e.id
            FROM map_events e
            ORDER BY e.created_at DESC
            """
        )
    )

    rows = []
    for row in result.fetchall():
        event = await get_map_event_with_votes(db, str(row[0]), current_user_id)
        if event is not None:
            rows.append(event)
    visible_rows = []
    for row in rows:
        if distance_in_km(lat, lon, float(row["lat"]), float(row["lon"])) > radius_km:
            continue

        is_owner = current_user_id is not None and row["user_id"] == current_user_id
        if not is_owner and int(row["downvotes"] or 0) >= MAP_EVENT_HIDE_DOWNVOTES:
            continue

        row["is_owner"] = is_owner
        visible_rows.append(row)

    return visible_rows


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
    return await get_map_event_with_votes(db, str(row.id), user_id)


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
        return await get_map_event_with_votes(db, str(row.id), user_id)

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


async def vote_map_event(
    db: AsyncSession,
    event_id: UUID,
    user_id: int | None,
    value: int,
):
    await ensure_map_events_table(db)

    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")

    owner_result = await db.execute(
        text("SELECT user_id FROM map_events WHERE id = :id"),
        {"id": str(event_id)},
    )
    owner_row = owner_result.fetchone()
    if not owner_row:
        raise HTTPException(status_code=404, detail="Map event not found")

    owner_user_id = owner_row[0]
    if owner_user_id == user_id:
        raise HTTPException(status_code=403, detail="You cannot vote for your own event")

    existing_vote = await db.execute(
        text(
            """
            SELECT value
            FROM map_event_votes
            WHERE event_id = :event_id AND user_id = :user_id
            """
        ),
        {"event_id": str(event_id), "user_id": user_id},
    )
    if existing_vote.fetchone():
        raise HTTPException(status_code=409, detail="You have already voted for this event")

    await db.execute(
        text(
            """
            INSERT INTO map_event_votes (event_id, user_id, value)
            VALUES (:event_id, :user_id, :value)
            """
        ),
        {"event_id": str(event_id), "user_id": user_id, "value": value},
    )
    await db.commit()
