from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.notifications.service import push_token, send_all_notifications
from app.features.notifications.schemas import NotificationSend, NotificationResponse, PushTokenCreate
from app.middleware.api_key_auth import verify_api_key
from app.features.users.service import get_user_by_firebase_uid

router = APIRouter()


@router.post("/api/v1/push-token", status_code=201)
async def save_token(
    body: PushTokenCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Register a device push token for the authenticated user."""
    firebase_uid = user.get("uid")
    db_user = await get_user_by_firebase_uid(db, firebase_uid)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
    await push_token(db, body.token, db_user["id"])
    return {"message": "Token saved"}


@router.post("/api/v1/notifications/send-all", response_model=NotificationResponse)
async def send_notifications(
    body: NotificationSend,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    result = await send_all_notifications(db, body.title, body.body, body.data)
    return result
