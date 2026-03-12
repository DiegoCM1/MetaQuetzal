from fastapi import HTTPException, APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.alerts.service import get_alerts, get_alert_by_id
from app.features.alerts.schemas import AlertSummary, AlertDetail

router = APIRouter()

@router.get("/alerts", response_model=list[AlertSummary])
async def list_alerts(db: AsyncSession = Depends(get_db), limit: int = 30, offset: int = 0):
    return await get_alerts(db, limit, offset)

@router.get("/alerts/{id}", response_model=AlertDetail)
async def list_alert(id:str, db: AsyncSession = Depends(get_db)):
    alert = await get_alert_by_id(db, id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
