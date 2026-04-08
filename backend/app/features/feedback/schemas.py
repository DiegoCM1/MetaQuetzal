from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class FeedbackCreate(BaseModel):
    rating: int
    message: str
    email: Optional[EmailStr] = None


class FeedbackResponse(BaseModel):
    rating: int
    message: str
    email: Optional[EmailStr] = None
    created_at: datetime
    id: int

