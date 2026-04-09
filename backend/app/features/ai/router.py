from fastapi import HTTPException, APIRouter
from app.features.ai.service import chat
from app.features.ai.schemas import Message, ChatRequest, ChatResponse


router = APIRouter()

@router.post("/ai/chat", status_code=200)
async def send_message(body: ChatRequest):
    reply = await chat(body.messages)
    return ChatResponse(reply=reply)