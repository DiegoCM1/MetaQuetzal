from pydantic import BaseModel

class NotificationSend(BaseModel):
    title:str
    body:str
    data: dict[str, str] | None = None

class NotificationResponse(BaseModel):
    success_count: int
    failure_count: int

class PushTokenCreate(BaseModel):
    token: str
    user_id: int | None = None  # set server-side from Firebase UID lookup

