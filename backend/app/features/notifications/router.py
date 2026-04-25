from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.notifications.service import push_token, send_all_notifications
from app.features.notifications.schemas import NotificationSend, NotificationResponse, PushTokenCreate
from app.middleware.api_key_auth import verify_api_key

router = APIRouter()


@router.post("/push-token", status_code=201)
async def save_token(body:PushTokenCreate, db: AsyncSession = Depends(get_db), user = Depends(get_current_user)):
    await push_token(db, body.token)

    return {"message": "Token Saved"}

@router.post("/notifications/send-all", response_model=NotificationResponse)
async def send_notifications(body:NotificationSend, db: AsyncSession = Depends(get_db), _: None = Depends(verify_api_key)):
    result = await send_all_notifications(db, body.title, body.body, body.data)
    return result





