"""
SIAT-CT evaluator.

Maps cyclone proximity + intensity to the five official SIAT-CT levels:
  1 - AZUL      (aviso preventivo, > 72 h)
  2 - VERDE     (preparación, 24–72 h)
  3 - AMARILLO  (alerta, 12–24 h)
  4 - NARANJA   (peligro alto, 6–12 h)
  5 - ROJO      (impacto inminente / en curso, < 6 h)

Primary strategy: ETA-based (distance / movement speed).
Fallback: distance + wind intensity when speed is unavailable.
"""

import math

SIAT_COLORS: dict[int, str] = {
    1: "AZUL",
    2: "VERDE",
    3: "AMARILLO",
    4: "NARANJA",
    5: "ROJO",
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _level_from_eta(eta_hours: float) -> int:
    if eta_hours < 6:
        return 5
    if eta_hours < 12:
        return 4
    if eta_hours < 24:
        return 3
    if eta_hours < 72:
        return 2
    return 1


def _level_from_distance(distance_km: float, wind_kmh: float) -> int:
    """Fallback when movement speed is unknown."""
    if distance_km < 100 and wind_kmh >= 150:
        return 5
    if distance_km < 200 and wind_kmh >= 100:
        return 4
    if distance_km < 400 and wind_kmh >= 75:
        return 3
    if distance_km < 600:
        return 2
    return 1


def evaluate_user(user_lat: float, user_lon: float, cyclone: dict) -> dict:
    """
    Returns a dict with: siat_level, siat_color, distance_km, eta_hours, reason.
    """
    distance_km = haversine_km(user_lat, user_lon, cyclone["lat"], cyclone["lon"])

    speed = cyclone.get("movement_speed_kmh") or 0.0
    eta_hours: float | None = (distance_km / speed) if speed > 0 else None

    if eta_hours is not None:
        level = _level_from_eta(eta_hours)
    else:
        level = _level_from_distance(distance_km, cyclone.get("wind_kmh", 0.0))

    reason_parts = [
        f"Ciclón: {cyclone.get('name', '?')} ({cyclone.get('status', '?')})",
        f"Distancia: {distance_km:.0f} km",
        f"Vientos: {cyclone.get('wind_kmh', 0):.0f} km/h",
    ]
    if eta_hours is not None:
        reason_parts.append(f"ETA estimada: {eta_hours:.1f}h")
    else:
        reason_parts.append("ETA: no disponible (velocidad de movimiento desconocida)")

    return {
        "siat_level": level,
        "siat_color": SIAT_COLORS[level],
        "distance_km": round(distance_km, 2),
        "eta_hours": round(eta_hours, 2) if eta_hours is not None else None,
        "reason": " | ".join(reason_parts),
    }
