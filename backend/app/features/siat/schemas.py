from pydantic import BaseModel
from datetime import datetime


class UserSiatStatus(BaseModel):
    user_id: int
    current_level: int
    siat_color: str
    last_notified_level: int | None
    last_notified_at: datetime | None
    active_cyclone_id: int | None
    updated_at: datetime


class AssessmentResult(BaseModel):
    user_id: int
    siat_level: int
    siat_color: str
    distance_km: float | None
    eta_hours: float | None
    reason: str


class RunCycleResponse(BaseModel):
    cyclones_found: int
    users_evaluated: int
    notifications_sent: int
    assessments: list[AssessmentResult]
