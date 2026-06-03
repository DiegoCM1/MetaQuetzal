from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from firebase_admin import auth
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.features.map_events.schemas import (
    MapEventCreate,
    MapEventResponse,
    MapEventUpdate,
)
from app.features.map_events.service import (
    DEFAULT_RADIUS_KM,
    create_map_event,
    delete_map_event,
    list_map_events,
    update_map_event,
)

router = APIRouter(prefix="/api/v1/map-events", tags=["map-events"])
DEV_BYPASS_MAP_EVENTS_AUTH = settings.DEV_BYPASS_MAP_EVENTS_AUTH


async def get_current_user_id(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> int:
    firebase_uid = decoded_token["uid"]
    result = await db.execute(
        text("SELECT id FROM users WHERE firebase_uid = :firebase_uid LIMIT 1"),
        {"firebase_uid": firebase_uid},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=404,
            detail="User profile not found. Call POST /api/v1/users/me first.",
        )
    return int(row[0])


async def get_map_events_user_id(
    decoded_token: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> int:
    if DEV_BYPASS_MAP_EVENTS_AUTH:
        return 1
    return await get_current_user_id(decoded_token=decoded_token, db=db)


@router.get("", response_model=list[MapEventResponse])
async def get_map_events(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(DEFAULT_RADIUS_KM, gt=0),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    return await list_map_events(db, lat=lat, lon=lon, radius_km=radius_km)


@router.post("", response_model=MapEventResponse, status_code=status.HTTP_201_CREATED)
async def post_map_event(
    payload: MapEventCreate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_map_events_user_id),
):
    return await create_map_event(db, payload, user_id)


@router.patch("/{event_id}", response_model=MapEventResponse)
async def patch_map_event(
    event_id: UUID,
    payload: MapEventUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_map_events_user_id),
):
    return await update_map_event(db, event_id, payload, user_id)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_map_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_map_events_user_id),
):
    await delete_map_event(db, event_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
