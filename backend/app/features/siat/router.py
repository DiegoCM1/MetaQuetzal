import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
from app.core.config import settings
from app.core.database import get_db
from app.features.siat.schemas import (
    AffectedUsersResponse, FakeCycloneRequest, InjectCycloneResponse,
    InjectSMNAlertRequest, InjectSMNAlertResponse, ResetStateResponse,
    RunCycleResponse, UserSiatStatus,
)
from app.features.siat.service import (
    get_affected_users, get_user_siat_status, inject_and_run_cycle,
    inject_smn_test_alert, reset_user_siat_state, run_cycle,
)
from app.features.users.service import get_user_by_firebase_uid
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


@router.post("/api/v1/siat/inject-cyclone", response_model=InjectCycloneResponse)
async def siat_inject_cyclone(
    body: FakeCycloneRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Insert a fake cyclone and immediately run a full SIAT cycle end-to-end.
    Dev/staging only — requires Firebase auth + admin email allowlist.
    """
    # ============================================================
    # TEMP VIDEO QA ONLY — DO NOT MERGE TO DEV — DO NOT DEPLOY TO PRODUCTION
    # Firebase auth is still required via get_current_user above.
    # Whitelist (NOTIFICATION_TEST_ADMIN_EMAILS) intentionally skipped for video recording.
    # ============================================================
    logger.warning("TEMP VIDEO QA ONLY: /siat/inject-cyclone accessed by uid=%s", current_user.get("uid"))

    db_user = await get_user_by_firebase_uid(db, current_user.get("uid"))
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
    if db_user.get("lat") is None or db_user.get("lon") is None:
        raise HTTPException(
            status_code=422,
            detail="No tienes ubicación registrada. Ve a Configuración → Ubicación, guarda tu posición, y vuelve a intentarlo.",
        )

    return await inject_and_run_cycle(db, body)


@router.post("/api/v1/siat/reset-state", response_model=ResetStateResponse)
async def siat_reset_state(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Clear the SIAT alert state for the authenticated user.
    Allows re-testing level escalation from scratch without changing preset.
    Any authenticated user can reset their own state.
    """
    db_user = await get_user_by_firebase_uid(db, current_user.get("uid"))
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found.")
    await reset_user_siat_state(db, db_user["id"])
    return {"message": "Estado SIAT reiniciado. La siguiente inyección evaluará desde cero.", "user_id": db_user["id"]}


@router.post("/api/v1/siat/inject-smn-alert", response_model=InjectSMNAlertResponse)
async def siat_inject_smn_alert(
    body: InjectSMNAlertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Insert a national test alert and immediately process it via the SMN geocercado path.
    Dev/staging only — requires Firebase auth + admin email allowlist.
    """
    # ============================================================
    # TEMP VIDEO QA ONLY — DO NOT MERGE TO DEV — DO NOT DEPLOY TO PRODUCTION
    # Firebase auth is still required via get_current_user above.
    # Whitelist (NOTIFICATION_TEST_ADMIN_EMAILS) intentionally skipped for video recording.
    # Note: this endpoint sends to ALL eligible staging users (national alert, no distance filter).
    # ============================================================
    logger.warning("TEMP VIDEO QA ONLY: /siat/inject-smn-alert accessed by uid=%s", current_user.get("uid"))
    return await inject_smn_test_alert(db, body.level, body.title, body.short)


@router.get(
    "/api/v1/siat/affected-users",
    response_model=AffectedUsersResponse,
    dependencies=[Depends(verify_api_key)],
)
async def siat_affected_users(
    lat: float,
    lon: float,
    radius_km: float = Query(default=500.0, gt=0),
    db: AsyncSession = Depends(get_db),
):
    """Return users within radius_km of (lat, lon). Protected by X-API-Key header."""
    users = await get_affected_users(db, lat, lon, radius_km)
    return {"total": len(users), "users": users}


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
