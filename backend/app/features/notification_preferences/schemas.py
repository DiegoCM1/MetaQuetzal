from pydantic import BaseModel


class NotificationPreferences(BaseModel):
    siat_enabled: bool
    min_siat_level: int
    map_events_enabled: bool


class NotificationPreferencesPatch(BaseModel):
    siat_enabled: bool | None = None
    min_siat_level: int | None = None
    map_events_enabled: bool | None = None
