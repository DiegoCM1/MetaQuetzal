import logging
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.users.schemas import UserProfile, UserLocationUpdate
from app.features.users.service import (
    upsert_user,
    update_user_location,
    get_user_by_firebase_uid,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/v1/users/me", response_model=UserProfile, status_code=201)
async def register_or_get_profile(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Create or update user profile from Firebase token. Idempotent."""
    firebase_uid = user.get("uid")
    return await upsert_user(db, firebase_uid)


@router.get("/api/v1/users/me", response_model=UserProfile)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    firebase_uid = user.get("uid")
    profile = await get_user_by_firebase_uid(db, firebase_uid)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found. Call POST /api/v1/users/me first.")
    return profile


@router.patch("/api/v1/users/me/location", response_model=UserProfile)
async def set_my_location(
    body: UserLocationUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Update the user's lat/lon. Required for SIAT-CT evaluations."""
    firebase_uid = user.get("uid")
    profile = await update_user_location(db, firebase_uid, body.lat, body.lon)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found. Call POST /api/v1/users/me first.")
    return profile


@router.delete("/api/v1/users/me")
async def delete_account(user=Depends(get_current_user)):
    # TODO: also delete the row from the `users` DB table to avoid orphans
    # on re-signup (a new Firebase UID creates a fresh row, leaving the old
    # one stranded). Defer until column lifecycle is decided.
    uid = user["uid"]
    try:
        auth.delete_user(uid)
        return {"message": "Account deleted"}
    except auth.UserNotFoundError:
        logger.warning(f"Delete attempted for non-existent Firebase user: {uid}")
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        logger.error(f"Failed to delete Firebase user {uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")


# Legacy alias for cached tester app builds shipped before the /api/v1 migration.
# Remove after Play Store testers have updated past the migration build.
@router.delete("/users/account", deprecated=True)
async def delete_account_legacy(user=Depends(get_current_user)):
    return await delete_account(user)
