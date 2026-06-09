from pydantic import BaseModel, Field
from datetime import datetime


class RoomCreate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    type: str = Field(default="group", pattern="^(group|direct)$")


class RoomResponse(BaseModel):
    id: int
    name: str | None
    type: str
    created_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: int
    room_id: int
    user_uid: str | None
    body: str
    created_at: datetime
