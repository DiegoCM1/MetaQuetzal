from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.siat.schemas import RunCycleResponse, UserSiatStatus
from app.features.siat.service import get_user_siat_status, run_cycle
from app.middleware.api_key_auth import verify_api_key

router = APIRouter()


@router.post(
    "/api/v1/siat/run-cycle",
    response_model=RunCycleResponse,
    dependencies=[Depends(verify_api_key)],
)
async def siat_run_cycle(db: AsyncSession = Depends(get_db)):
    """
    Fetch active cyclones from NHC, evaluate all users with location,
    persist SIAT assessments, and send per-user push notifications on level escalation.
    Protected by X-API-Key header.
    """
    return await run_cycle(db)


@router.get(
    "/api/v1/siat/status/{user_id}",
    response_model=UserSiatStatus,
    dependencies=[Depends(verify_api_key)],
)
async def siat_user_status(user_id: int, db: AsyncSession = Depends(get_db)):
    """Current SIAT-CT level for a user. Requires X-API-Key header."""
    status = await get_user_siat_status(db, user_id)
    if status is None:
        raise HTTPException(status_code=404, detail="No SIAT assessment found for this user")
    return status
