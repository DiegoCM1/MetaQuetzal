from enum import Enum
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
    # Opcional para no romper clientes viejos. NULL significa "build anterior a iOS",
    # que por construcción es Android — ver el backfill en main.py.
    platform: str | None = None
    user_id: int | None = None  # set server-side from Firebase UID lookup


class NotificationTestType(str, Enum):
    hurricane_l2 = "hurricane_l2"
    hurricane_l3 = "hurricane_l3"
    hurricane_l4 = "hurricane_l4"
    sos_test     = "sos_test"
    generic      = "generic"


class NotificationTestRequest(BaseModel):
    type: NotificationTestType
    only_me: bool = False  # True → push solo al dispositivo del usuario autenticado

