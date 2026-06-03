from fastapi import HTTPException, APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.ai.service import chat, alert_summary
from app.features.ai.schemas import ChatRequest, AlertSummaryRequest, AlertSummaryResponse
from app.core.auth import get_current_user


router = APIRouter()

@router.post("/ai/chat", status_code=200)
async def send_message(body: ChatRequest, user=Depends(get_current_user)):
    return StreamingResponse(
        chat(body.messages, body.location, body.latitude, body.longitude),
        media_type="text/event-stream",
    )


@router.post("/api/v1/ai/alert-summary", response_model=AlertSummaryResponse)
async def post_alert_summary(
    body: AlertSummaryRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        summary = await alert_summary(db, body.alert_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    except RuntimeError:
        raise HTTPException(status_code=503, detail="LLM no disponible")
    return AlertSummaryResponse(alert_id=body.alert_id, summary=summary)