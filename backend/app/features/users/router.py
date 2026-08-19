import logging
from fastapi import APIRouter, Depends, HTTPException
from firebase_admin import auth
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.users.schemas import (
    UserProfile,
    UserLocationUpdate,
    PhoneUpdate,
    ProfileUpdate,
)
from app.features.users.service import (
    upsert_user,
    update_user_location,
    update_user_phone,
    update_user_profile,
    get_user_by_firebase_uid,
    delete_user_by_firebase_uid,
)
from app.features.notification_preferences.service import upsert_preferences

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


# Los dos sliders del onboarding no viven en `users` sino en `notification_preferences`.
# El endpoint escribe ambas tablas, así que este es el reparto de claves.
_PREFERENCE_FIELDS = ("nervousness_level", "weather_info_level")


@router.put("/api/v1/users/me/profile", response_model=UserProfile)
async def put_my_profile(
    body: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Guarda el perfil completo del onboarding en una sola transacción.

    Es PUT y no PATCH porque el cliente reintenta este envío cuando falla (mala señal
    durante el onboarding) y cuando rellena instalaciones viejas. Reenviar el mismo
    perfil tiene que ser inofensivo; esa es toda la razón por la que el reintento del
    cliente puede correr en cada arranque sin pensarlo.

    `exclude_unset=True` es lo que distingue "no mandé este campo" de "mándalo a NULL":
    sin eso, un payload parcial borraría las columnas ausentes.
    """
    firebase_uid = user.get("uid")
    updates = body.model_dump(exclude_unset=True)

    profile = await get_user_by_firebase_uid(db, firebase_uid)
    if profile is None:
        # Mismo contrato que el resto de los endpoints de este router: la fila la crea
        # POST /api/v1/users/me. Es además la carrera de arranque ya documentada en
        # `frontend/utils/pushTelemetry.ts`, así que se loguea como aviso, no como error.
        logger.warning("Profile PUT before user row exists uid=%s", firebase_uid)
        raise HTTPException(status_code=404, detail="Profile not found. Call POST /api/v1/users/me first.")

    pref_updates = {k: v for k, v in updates.items() if k in _PREFERENCE_FIELDS}
    user_updates = {k: v for k, v in updates.items() if k not in _PREFERENCE_FIELDS}

    if not updates:
        logger.info("Profile PUT with empty payload user_id=%s — no-op", profile["id"])
        return profile

    try:
        # Ambas escrituras con commit=False y UN solo commit al final: o entra el perfil
        # completo o no entra nada. Un perfil a medias es indistinguible de uno completo
        # para el cliente, que ya marcó el envío como exitoso — por eso no puede pasar.
        updated = await update_user_profile(db, firebase_uid, user_updates, commit=False)
        if updated is None:
            await db.rollback()
            raise HTTPException(status_code=404, detail="Profile not found. Call POST /api/v1/users/me first.")

        if pref_updates:
            await upsert_preferences(db, profile["id"], pref_updates, commit=False)

        await db.commit()
    except HTTPException:
        raise
    except Exception:
        await db.rollback()
        # Los NOMBRES de los campos, nunca los valores: este payload trae nombre,
        # teléfono y domicilio. Un log de producción no es lugar para eso, y con los
        # nombres basta para reproducir el fallo.
        logger.error(
            "Profile PUT failed user_id=%s fields=%s",
            profile["id"], sorted(updates), exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to save profile")

    logger.info(
        "Profile saved user_id=%s fields=%s prefs=%s",
        profile["id"], sorted(user_updates), sorted(pref_updates),
    )
    return await get_user_by_firebase_uid(db, firebase_uid)


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
