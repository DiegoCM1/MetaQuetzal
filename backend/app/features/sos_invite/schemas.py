from datetime import datetime
from pydantic import BaseModel


class InviteCreateResponse(BaseModel):
    share_url: str
    expires_at: datetime
    push_sent: bool = False


class InvitePreviewResponse(BaseModel):
    inviter_display_name: str
    contact_name: str
    expires_at: datetime


class InviteAcceptResponse(BaseModel):
    inviter_display_name: str
    contact_name: str
