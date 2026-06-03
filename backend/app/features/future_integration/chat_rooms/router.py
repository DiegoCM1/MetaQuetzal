from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.features.chat.schemas import RoomCreate, RoomResponse, MessageCreate, MessageResponse
from app.features.chat.service import create_room, list_rooms, join_room, send_message, list_messages

router = APIRouter()


@router.post("/api/v1/chat/rooms", response_model=RoomResponse, status_code=201)
async def create_chat_room(
    body: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await create_room(db, body.name, body.type, current_user["id"])


@router.get("/api/v1/chat/rooms", response_model=list[RoomResponse])
async def my_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return await list_rooms(db, current_user["id"])


@router.post("/api/v1/chat/rooms/{room_id}/join", status_code=200)
async def join_chat_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ok = await join_room(db, room_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"message": "Joined"}


@router.post("/api/v1/chat/rooms/{room_id}/messages", response_model=MessageResponse, status_code=201)
async def post_message(
    room_id: int,
    body: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msg = await send_message(db, room_id, current_user["id"], body.body)
    if msg is None:
        raise HTTPException(status_code=403, detail="Not a member of this room")
    return msg


@router.get("/api/v1/chat/rooms/{room_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    room_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    msgs = await list_messages(db, room_id, current_user["id"], limit, offset)
    if msgs is None:
        raise HTTPException(status_code=403, detail="Not a member of this room")
    return msgs
