from pydantic import BaseModel
from datetime import datetime


class UserProfile(BaseModel):
    id: int
    firebase_uid: str
    lat: float | None
    lon: float | None
    created_at: datetime
    updated_at: datetime


class UserLocationUpdate(BaseModel):
    lat: float
    lon: float
