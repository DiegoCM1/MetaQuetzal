from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

class AlertSummary(BaseModel):
    id:UUID
    timestamp:datetime
    level:int
    score:int
    title:str
    short:str


class AlertDetail(BaseModel):
    id: UUID
    timestamp: datetime
    level: int
    score: int
    title: str
    short: str
    lat: float
    lon: float
    factors: list
    recommendations: list


class AlertCreate(BaseModel):
    level: int = Field(ge=1, le=5)
    score: int = Field(ge=0, le=100)
    title: str = Field(min_length=1, max_length=255)
    short: str = Field(min_length=1, max_length=500)
    lat: float
    lon: float
    factors: list = []
    recommendations: list = []


class AlertWithSIAT(BaseModel):
    id: UUID
    timestamp: datetime
    level: int
    score: int
    title: str
    short: str
    siat_level: int | None = None
    siat_color: str | None = None


class OpenWeatherAlert(BaseModel):
    sender_name: str
    event: str
    start: int
    end: int
    description: str
    tags: list[str]


class OpenWeatherLocation(BaseModel):
    lat: float
    lon: float
    timezone: str
    timezone_offset: int


class OpenWeatherCurrent(BaseModel):
    temperature: float
    humidity: int
    pressure: int
    wind_speed: float
    wind_deg: int
    weather: str
    description: str


class OneCallAlertsResponse(BaseModel):
    location: OpenWeatherLocation
    current: OpenWeatherCurrent
    risk_level: int
    alerts: list[OpenWeatherAlert]
    alerts_count: int
    has_alerts: bool


class MexicoWeatherPoint(BaseModel):
    name: str
    location: OpenWeatherLocation
    current: OpenWeatherCurrent
    risk_level: int
    alerts: list[OpenWeatherAlert]
    alerts_count: int
    has_alerts: bool


class MexicoWeatherOverviewResponse(BaseModel):
    country: str
    generated_at: datetime
    points_count: int
    points_with_alerts: int
    points: list[MexicoWeatherPoint]
