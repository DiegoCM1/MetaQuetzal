from fastapi import HTTPException, APIRouter, Depends
from app.features.ai.service import chat
from app.features.ai.schemas import ChatRequest, ChatResponse
from app.core.auth import get_current_user


router = APIRouter()

@router.post("/ai/chat", status_code=200)
async def send_message(body: ChatRequest, user=Depends(get_current_user)):
    reply = await chat(body.messages, body.location, body.latitude, body.longitude)
    return ChatResponse(reply=reply)