from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.users.service import get_user_by_firebase_uid
from app.features.notification_preferences.service import get_preferences, upsert_preferences, QuietHoursValidationError
from app.features.notification_preferences.schemas import NotificationPreferences, NotificationPreferencesPatch

router = APIRouter()


@router.get("/api/v1/notification-preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    firebase_uid = user.get("uid")
    db_user = await get_user_by_firebase_uid(db, firebase_uid)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
    return await get_preferences(db, db_user["id"])


@router.patch("/api/v1/notification-preferences", response_model=NotificationPreferences)
async def patch_notification_preferences(
    body: NotificationPreferencesPatch,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    firebase_uid = user.get("uid")
    db_user = await get_user_by_firebase_uid(db, firebase_uid)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
    updates = body.model_dump(exclude_none=True)
    try:
        return await upsert_preferences(db, db_user["id"], updates)
    except QuietHoursValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
