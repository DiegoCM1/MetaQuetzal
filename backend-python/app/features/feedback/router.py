from fastapi import HTTPException, Depends, APIRouter
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.feedback.service import upload_feedback, get_all_feedback
from app.features.feedback.schemas import FeedbackCreate, FeedbackResponse


router = APIRouter()

@router.post("/feedback", status_code=201)
async def load_feedback(body: FeedbackCreate, db: AsyncSession = Depends(get_db)):
    id = await upload_feedback(db, body.rating, body.email, body.message)
    return {"id": id}



@router.get("/feedback", response_model=list[FeedbackResponse])
async def show_all_feedbacks(db: AsyncSession = Depends(get_db)):
    return await get_all_feedback(db)