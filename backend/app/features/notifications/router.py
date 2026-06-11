import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
from app.features.notifications.service import push_token, send_all_notifications, send_targeted_notification
from app.features.notifications.schemas import (
    NotificationSend, NotificationResponse, PushTokenCreate,
    NotificationTestType, NotificationTestRequest,
)
from app.middleware.api_key_auth import verify_api_key
from app.core.config import settings
from app.features.users.service import get_user_by_firebase_uid

router = APIRouter()

_TEST_PAYLOADS: dict[str, dict] = {
    "hurricane_l2": {
        "title": "Alerta SIAT-CT Verde [PRUEBA]",
        "body": "Ciclón de prueba | Distancia: ~200 km | ETA: ~36h",
        "data": {"siat_level": "2", "siat_color": "VERDE"},
    },
    "hurricane_l3": {
        "title": "Alerta SIAT-CT Amarillo [PRUEBA]",
        "body": "Ciclón de prueba | Distancia: ~120 km | ETA: ~18h",
        "data": {"siat_level": "3", "siat_color": "AMARILLO"},
    },
    "hurricane_l4": {
        "title": "Alerta SIAT-CT Naranja [PRUEBA]",
        "body": "Ciclón de prueba | Distancia: ~50 km | ETA: ~8h",
        "data": {"siat_level": "4", "siat_color": "NARANJA", "fullScreen": "true"},
    },
    "sos_test": {
        "title": "SOS — Equipo BluEye [PRUEBA]",
        "body": "Necesita ayuda urgente. Toca para ver su ubicación.",
        "data": {"category": "sos", "sender_name": "Test BluEye",
                 "lat": "19.43264", "lon": "-99.13318"},
    },
    "generic": {
        "title": "Notificación de prueba [PRUEBA]",
        "body": "Esta es una notificación de prueba del equipo BluEye.",
        "data": {},
    },
}


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
    try:
        return await send_all_notifications(db, body.title, body.body, body.data)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Error al enviar notificaciones. Intenta de nuevo.")


@router.post("/api/v1/notifications/test", response_model=NotificationResponse)
async def send_test_notification(
    body: NotificationTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Send a test notification to all devices. Requires Firebase auth + admin email allowlist."""
    # ============================================================
    # TEMP VIDEO QA ONLY — DO NOT MERGE TO DEV — DO NOT DEPLOY TO PRODUCTION
    # Firebase auth is still required via get_current_user above.
    # Whitelist (NOTIFICATION_TEST_ADMIN_EMAILS) intentionally skipped for video recording.
    # ============================================================
    logger.warning("TEMP VIDEO QA ONLY: /notifications/test accessed by uid=%s", current_user.get("uid"))

    payload = _TEST_PAYLOADS[body.type]
    try:
        if body.only_me:
            db_user = await get_user_by_firebase_uid(db, current_user.get("uid"))
            if db_user is None:
                raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
            return await send_targeted_notification(db, db_user["id"], payload["title"], payload["body"], payload["data"])
        return await send_all_notifications(db, payload["title"], payload["body"], payload["data"])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Error al enviar notificaciones. Intenta de nuevo.")


# Legacy aliases for cached tester app builds shipped before the /api/v1 migration.
# Remove after Play Store testers have updated past the migration build.
@router.post("/push-token", status_code=201, deprecated=True)
async def save_token_legacy(
    body: PushTokenCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await save_token(body=body, db=db, user=user)


@router.post("/notifications/send-all", response_model=NotificationResponse, deprecated=True)
async def send_notifications_legacy(
    body: NotificationSend,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_api_key),
):
    return await send_notifications(body=body, db=db, _=_)
