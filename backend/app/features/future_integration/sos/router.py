from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.sos.schemas import SOSCreate, SOSResponse, SOSResolve
from app.features.sos.service import create_sos, list_sos, get_sos_by_id, resolve_sos, list_sos_by_user

router = APIRouter()


@router.post("/api/v1/sos", response_model=SOSResponse, status_code=201)
async def trigger_sos(
    body: SOSCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Authenticated user triggers SOS with location."""
    event = await create_sos(db, current_user["id"], body.lat, body.lon, body.message)
    return event


@router.get("/api/v1/sos/me", response_model=list[SOSResponse])
async def my_sos_events(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List SOS events for the authenticated user."""
    return await list_sos_by_user(db, current_user["id"], limit, offset)


@router.get("/api/v1/sos", response_model=list[SOSResponse])
async def list_sos_events(
    status: str | None = Query(default=None, pattern="^(active|resolved|cancelled)$"),
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List all SOS events. Requires authentication."""
    return await list_sos(db, status, limit, offset)


@router.get("/api/v1/sos/{sos_id}", response_model=SOSResponse)
async def get_sos(
    sos_id: int,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    event = await get_sos_by_id(db, sos_id)
    if event is None:
        raise HTTPException(status_code=404, detail="SOS event not found")
    return event


@router.patch("/api/v1/sos/{sos_id}/resolve", response_model=SOSResponse)
async def resolve_sos_event(
    sos_id: int,
    body: SOSResolve,
    db: AsyncSession = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    event = await resolve_sos(db, sos_id, body.status)
    if event is None:
        raise HTTPException(status_code=404, detail="SOS event not found or already resolved")
    return event
