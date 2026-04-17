from pydantic import BaseModel, Field
from datetime import datetime


class SOSCreate(BaseModel):
    lat: float
    lon: float
    message: str | None = Field(default=None, max_length=500)


class SOSResponse(BaseModel):
    id: int
    user_id: int | None
    lat: float
    lon: float
    message: str | None
    status: str
    created_at: datetime
    resolved_at: datetime | None


class SOSResolve(BaseModel):
    status: str = Field(default="resolved", pattern="^(resolved|cancelled)$")
