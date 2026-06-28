from datetime import datetime
from pydantic import BaseModel, Field


class SOSContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    relationship: str | None = Field(default=None, max_length=60)


class SOSContactUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = Field(default=None, min_length=5, max_length=30)
    relationship: str | None = Field(default=None, max_length=60)


class SOSContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone: str
    relationship: str | None
    linked_user_id: int | None
    link_status: str
    created_at: datetime
    updated_at: datetime


class WhoHasMeItem(BaseModel):
    owner_user_id: int
    name: str
    relationship: str | None
    owner_display_name: str | None
    owner_phone: str | None
    already_my_contact: bool
    created_at: datetime
