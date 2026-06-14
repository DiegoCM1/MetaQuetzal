from pydantic import BaseModel
from datetime import datetime


class UserProfile(BaseModel):
    id: int
    firebase_uid: str
    display_name: str | None
    email: str | None
    phone: str | None
    lat: float | None
    lon: float | None
    created_at: datetime
    updated_at: datetime


class UserLocationUpdate(BaseModel):
    lat: float
    lon: float


class PhoneUpdate(BaseModel):
    phone: str
