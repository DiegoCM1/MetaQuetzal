import logging
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.users.schemas import UserProfile, UserLocationUpdate, PhoneUpdate
from app.features.users.service import (
    upsert_user,
    update_user_location,
    update_user_phone,
    get_user_by_firebase_uid,
    delete_user_by_firebase_uid,
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
    return await upsert_user(db, firebase_uid, display_name=user.get("name"), email=user.get("email"))


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


@router.patch("/api/v1/users/me/phone", response_model=UserProfile)
async def set_my_phone(
    body: PhoneUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Store the user's phone number so SOS invites can find them by phone."""
    firebase_uid = user.get("uid")
    profile = await update_user_phone(db, firebase_uid, body.phone)
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
async def delete_account(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Borra la cuenta: fila de `users` (con cascada) y luego el usuario de Firebase.

    **El orden no es arbitrario.** Los dos borrados pueden fallar por separado, así que
    hay que elegir cuál huérfano es menos malo:

    - DB primero: si Firebase falla, el usuario todavía puede entrar y se le crea un
      perfil nuevo. Recuperable, y **ya no quedan push tokens**.
    - Firebase primero: si la DB falla, el usuario no puede entrar *pero sus tokens
      siguen vivos* — o sea que una cuenta borrada sigue recibiendo alertas de huracán
      y ya no hay forma de entrar a apagarlas. Eso es exactamente lo que prohíbe la
      Guideline 5.1.1(v).

    El fallo de la DB primero es reversible; el de Firebase primero no.
    """
    uid = user["uid"]

    try:
        await delete_user_by_firebase_uid(db, uid)
    except Exception as e:
        logger.error(f"Failed to delete DB row for user {uid}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete account")

    try:
        auth.delete_user(uid)
    except auth.UserNotFoundError:
        # La fila de la DB ya se fue, que es lo que importaba. Un reintento del cliente
        # no debe ver un 404 por algo que ya está resuelto.
        logger.warning(f"Firebase user already absent, DB row deleted: {uid}")
    except Exception as e:
        logger.error(f"DB row deleted but Firebase delete failed for {uid}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

    return {"message": "Account deleted"}


# Legacy alias for cached tester app builds shipped before the /api/v1 migration.
# Remove after Play Store testers have updated past the migration build.
@router.delete("/users/account", deprecated=True)
async def delete_account_legacy(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await delete_account(db=db, user=user)
