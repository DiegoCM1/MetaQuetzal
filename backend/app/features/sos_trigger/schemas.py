from pydantic import BaseModel


class SOSTriggerRequest(BaseModel):
    lat: float | None = None
    lon: float | None = None


class SOSTriggerResponse(BaseModel):
    notified_count: int
    skipped_count: int
    sos_event_id: int
