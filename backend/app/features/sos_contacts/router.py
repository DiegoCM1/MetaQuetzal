from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.features.users.service import get_user_by_firebase_uid
from app.features.sos_contacts.schemas import SOSContactCreate, SOSContactResponse, SOSContactUpdate
from app.features.sos_contacts.service import (
    create_sos_contact,
    delete_sos_contact,
    list_sos_contacts,
    update_sos_contact,
)

router = APIRouter()


async def _get_user_id(db: AsyncSession, user: dict) -> int:
    db_user = await get_user_by_firebase_uid(db, user.get("uid"))
    if db_user is None:
        raise HTTPException(status_code=404, detail="User profile not found. Call POST /api/v1/users/me first.")
    return int(db_user["id"])


@router.get("/api/v1/sos-contacts", response_model=list[SOSContactResponse])
async def get_sos_contacts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = await _get_user_id(db, user)
    return await list_sos_contacts(db, user_id)


@router.post("/api/v1/sos-contacts", response_model=SOSContactResponse, status_code=status.HTTP_201_CREATED)
async def post_sos_contact(
    body: SOSContactCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = await _get_user_id(db, user)
    return await create_sos_contact(db, user_id, body)


@router.patch("/api/v1/sos-contacts/{contact_id}", response_model=SOSContactResponse)
async def patch_sos_contact(
    contact_id: int,
    body: SOSContactUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = await _get_user_id(db, user)
    return await update_sos_contact(db, contact_id, user_id, body)


@router.delete("/api/v1/sos-contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sos_contact_route(
    contact_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = await _get_user_id(db, user)
    await delete_sos_contact(db, contact_id, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
