import asyncio
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from app.core.config import settings


MEXICO_BOUNDS = {
    "lat_min": 14.0,
    "lat_max": 33.0,
    "lon_min": -118.5,
    "lon_max": -86.0,
}


MEXICO_REFERENCE_POINTS = [
    {"name": "Tijuana", "lat": 32.5149, "lon": -117.0382},
    {"name": "Monterrey", "lat": 25.6866, "lon": -100.3161},
    {"name": "Chihuahua", "lat": 28.6320, "lon": -106.0691},
    {"name": "Guadalajara", "lat": 20.6597, "lon": -103.3496},
    {"name": "Ciudad de Mexico", "lat": 19.4326, "lon": -99.1332},
    {"name": "Veracruz", "lat": 19.1738, "lon": -96.1342},
    {"name": "Acapulco", "lat": 16.8531, "lon": -99.8237},
    {"name": "Merida", "lat": 20.9674, "lon": -89.5926},
    {"name": "Cancun", "lat": 21.1619, "lon": -86.8515},
    {"name": "Villahermosa", "lat": 17.9895, "lon": -92.9475},
    {"name": "Oaxaca", "lat": 17.0732, "lon": -96.7266},
    {"name": "La Paz", "lat": 24.1426, "lon": -110.3128},
]


def saffir_category_from_wind_ms(wind_speed_ms: float) -> int:
    kmh = wind_speed_ms * 3.6
    if kmh >= 252:
        return 5
    if kmh >= 209:
        return 4
    if kmh >= 178:
        return 3
    if kmh >= 154:
        return 2
    if kmh >= 119:
        return 1
    return 0


def _validate_mexico_coordinates(lat: float, lon: float):
    if not (MEXICO_BOUNDS["lat_min"] <= lat <= MEXICO_BOUNDS["lat_max"]):
        raise HTTPException(
            status_code=422,
            detail="lat is outside Mexico bounds",
        )
    if not (MEXICO_BOUNDS["lon_min"] <= lon <= MEXICO_BOUNDS["lon_max"]):
        raise HTTPException(
            status_code=422,
            detail="lon is outside Mexico bounds",
        )


def _normalize_onecall_response(data: dict, lat: float, lon: float) -> dict:
    current = data.get("current", {})
    weather_list = current.get("weather", [])
    first_weather = weather_list[0] if weather_list else {}

    wind_speed = float(current.get("wind_speed", 0.0) or 0.0)
    risk_level = saffir_category_from_wind_ms(wind_speed)
    openweather_alerts = data.get("alerts", []) or []

    return {
        "location": {
            "lat": lat,
            "lon": lon,
            "timezone": data.get("timezone", "UTC"),
            "timezone_offset": int(data.get("timezone_offset", 0) or 0),
        },
        "current": {
            "temperature": float(current.get("temp", 0.0) or 0.0),
            "humidity": int(current.get("humidity", 0) or 0),
            "pressure": int(current.get("pressure", 0) or 0),
            "wind_speed": wind_speed,
            "wind_deg": int(current.get("wind_deg", 0) or 0),
            "weather": str(first_weather.get("main", "")),
            "description": str(first_weather.get("description", "")),
        },
        "risk_level": risk_level,
        "alerts": [
            {
                "sender_name": alert.get("sender_name", ""),
                "event": alert.get("event", ""),
                "start": int(alert.get("start", 0) or 0),
                "end": int(alert.get("end", 0) or 0),
                "description": alert.get("description", ""),
                "tags": alert.get("tags", []) or [],
            }
            for alert in openweather_alerts
        ],
        "alerts_count": len(openweather_alerts),
        "has_alerts": len(openweather_alerts) > 0,
    }


async def _fetch_onecall_data(client: httpx.AsyncClient, lat: float, lon: float, exclude: str | None = None):
    params = {
        "lat": lat,
        "lon": lon,
        "appid": settings.OPENWEATHER_API_KEY,
        "units": "metric",
        "lang": "es",
    }
    if exclude:
        params["exclude"] = exclude

    try:
        response = await client.get(
            "https://api.openweathermap.org/data/3.0/onecall",
            params=params,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"OpenWeather error: {detail}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Error contacting OpenWeather") from exc

    return data


async def fetch_onecall_alerts(lat: float, lon: float, exclude: str | None = None):
    _validate_mexico_coordinates(lat, lon)

    async with httpx.AsyncClient(timeout=20.0) as client:
        data = await _fetch_onecall_data(client, lat=lat, lon=lon, exclude=exclude)

    return _normalize_onecall_response(data=data, lat=lat, lon=lon)


async def fetch_mexico_overview(exclude: str | None = "minutely,daily"):
    async with httpx.AsyncClient(timeout=20.0) as client:
        tasks = [
            _fetch_onecall_data(
                client=client,
                lat=point["lat"],
                lon=point["lon"],
                exclude=exclude,
            )
            for point in MEXICO_REFERENCE_POINTS
        ]
        responses = await asyncio.gather(*tasks)

    points = []
    for point, data in zip(MEXICO_REFERENCE_POINTS, responses):
        normalized = _normalize_onecall_response(
            data=data,
            lat=point["lat"],
            lon=point["lon"],
        )
        points.append({
            "name": point["name"],
            **normalized,
        })

    points_with_alerts = sum(1 for item in points if item["has_alerts"])

    return {
        "country": "MX",
        "generated_at": datetime.now(timezone.utc),
        "points_count": len(points),
        "points_with_alerts": points_with_alerts,
        "points": points,
    }
