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

