import re
from pydantic import BaseModel, field_validator

_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


class NotificationPreferences(BaseModel):
    siat_enabled: bool
    min_siat_level: int
    map_events_enabled: bool
    quiet_hours_enabled: bool
    quiet_start: str | None
    quiet_end: str | None


class NotificationPreferencesPatch(BaseModel):
    siat_enabled: bool | None = None
    min_siat_level: int | None = None
    map_events_enabled: bool | None = None
    quiet_hours_enabled: bool | None = None
    quiet_start: str | None = None
    quiet_end: str | None = None

    @field_validator("quiet_start", "quiet_end")
    @classmethod
    def validate_time_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not _TIME_RE.match(v):
            raise ValueError("Time must be in HH:MM format")
        h, m = map(int, v.split(":"))
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError("Invalid time value: hour must be 00-23, minute 00-59")
        return v
