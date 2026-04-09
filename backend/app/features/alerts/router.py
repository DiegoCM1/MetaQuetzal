from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.alerts.openweather_service import fetch_mexico_overview, fetch_onecall_alerts
from app.features.alerts.schemas import (
    AlertDetail,
    AlertSummary,
    MexicoWeatherOverviewResponse,
    OneCallAlertsResponse,
)
from app.features.alerts.service import get_alert_by_id, get_alerts

router = APIRouter()


@router.get("/alerts", response_model=list[AlertSummary])
async def list_alerts(db: AsyncSession = Depends(get_db), limit: int = 30, offset: int = 0):
    return await get_alerts(db, limit, offset)


@router.get("/api/v1/alerts", response_model=list[AlertSummary])
async def list_alerts_v1(db: AsyncSession = Depends(get_db), limit: int = 30, offset: int = 0):
    return await get_alerts(db, limit, offset)


@router.get("/api/v1/alerts/weather", response_model=OneCallAlertsResponse)
async def list_weather_alerts_v1(
    lat: float,
    lon: float,
    exclude: str | None = "minutely,daily",
):
    return await fetch_onecall_alerts(lat=lat, lon=lon, exclude=exclude)


@router.get("/api/v1/alerts/weather/mx", response_model=MexicoWeatherOverviewResponse)
async def list_weather_alerts_mx_v1(
    exclude: str | None = "minutely,daily",
):
    return await fetch_mexico_overview(exclude=exclude)


@router.get("/alerts/{id}", response_model=AlertDetail)
async def list_alert(id: str, db: AsyncSession = Depends(get_db)):
    alert = await get_alert_by_id(db, id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.get("/api/v1/alerts/{id}", response_model=AlertDetail)
async def list_alert_v1(id: str, db: AsyncSession = Depends(get_db)):
    alert = await get_alert_by_id(db, id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
