from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.alerts.openweather_service import fetch_mexico_overview, fetch_onecall_alerts
from app.features.alerts.schemas import (
    AlertCreate,
    AlertDetail,
    AlertSummary,
    MexicoWeatherOverviewResponse,
    OneCallAlertsResponse,
)
from app.features.alerts.service import create_alert, get_alert_by_id, get_alerts
from app.core.auth import get_current_user
from app.middleware.api_key_auth import verify_api_key


router = APIRouter()


@router.post("/api/v1/alerts", response_model=AlertDetail, status_code=201,
             dependencies=[Depends(verify_api_key)])
async def create_alert_v1(body: AlertCreate, db: AsyncSession = Depends(get_db)):
    """Create a new alert. Protected by X-API-Key (internal/admin use)."""
    return await create_alert(
        db=db,
        level=body.level, score=body.score, title=body.title, short=body.short,
        lat=body.lat, lon=body.lon, factors=body.factors, recommendations=body.recommendations,
    )


@router.get("/alerts", response_model=list[AlertSummary])
async def list_alerts(db: AsyncSession = Depends(get_db), limit: int = 30, offset: int = 0, user=Depends(get_current_user)):
    return await get_alerts(db, limit, offset)


@router.get("/api/v1/alerts", response_model=list[AlertSummary])
async def list_alerts_v1(db: AsyncSession = Depends(get_db), limit: int = 30, offset: int = 0, user=Depends(get_current_user)):
    return await get_alerts(db, limit, offset)


@router.get("/api/v1/alerts/weather", response_model=OneCallAlertsResponse)
async def list_weather_alerts_v1(
    lat: float,
    lon: float,
    exclude: str | None = "minutely,daily",
    user=Depends(get_current_user)
):
    return await fetch_onecall_alerts(lat=lat, lon=lon, exclude=exclude)


@router.get("/api/v1/alerts/weather/mx", response_model=MexicoWeatherOverviewResponse)
async def list_weather_alerts_mx_v1(
    exclude: str | None = "minutely,daily", user=Depends(get_current_user)
):
    return await fetch_mexico_overview(exclude=exclude)


@router.get("/alerts/{id}", response_model=AlertDetail)
async def list_alert(id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    alert = await get_alert_by_id(db, id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/api/v1/alerts/{id}", response_model=AlertDetail)
async def list_alert_v1(id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    alert = await get_alert_by_id(db, id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
