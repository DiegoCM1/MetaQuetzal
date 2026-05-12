from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


ZoneType = Literal["natural", "vial", "peligro", "ayuda"]


class MapEventCreate(BaseModel):
    type: ZoneType
    description: str = Field(min_length=1, max_length=2000)
    lat: float
    lon: float


class MapEventUpdate(BaseModel):
    description: str = Field(min_length=1, max_length=2000)


class MapEventResponse(BaseModel):
    id: UUID
    user_id: int | None
    type: ZoneType
    description: str
    lat: float
    lon: float
    created_at: datetime
    updated_at: datetime
