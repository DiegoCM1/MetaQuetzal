"""
SIAT-CT evaluator.

Maps cyclone proximity + intensity to the five official SIAT-CT levels:
  1 - AZUL      (aviso preventivo, > 72 h)
  2 - VERDE     (preparación, 24–72 h)
  3 - AMARILLO  (alerta, 12–24 h)
  4 - NARANJA   (peligro alto, 6–12 h)
  5 - ROJO      (impacto inminente / en curso, < 6 h)

Primary strategy: ETA-based (distance / movement speed).
Stationary cyclone fallback: distance + wind intensity with conservative thresholds.
Out-of-range: cyclones beyond MAX_THREAT_DISTANCE_KM are flagged — the service
layer skips DB writes and notifications for these to reduce noise.

Known limitation: ETA is straight-line distance / speed and does NOT account for
the cyclone's bearing or forecast track. A cyclone moving away from the user
produces the same ETA as one approaching at the same speed. The implementation
errs on the side of over-alerting (false positives) rather than missing threats.
Incorporating NHC forecast cone data would eliminate this in a future version.
"""

import math

SIAT_COLORS: dict[int, str] = {
    1: "AZUL",
    2: "VERDE",
    3: "AMARILLO",
    4: "NARANJA",
    5: "ROJO",
}

MAX_THREAT_DISTANCE_KM = 1500
# Beyond this range, even a fast-moving cyclone (20 km/h) takes > 75 h to arrive —
# safely above the AZUL threshold. Assessments beyond this distance are
# operationally irrelevant and would flood the DB with noise.


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
    """
    Fallback for stationary cyclones (movementSpeed = 0): ETA is undefined so
    level is derived from proximity and intensity. Thresholds are deliberately
    tighter than the ETA-based path to account for the sustained danger a stalled
    system poses even without an imminent landfall trajectory.
    """
    if distance_km < 150 and wind_kmh >= 150:
        return 5
    if distance_km < 300 and wind_kmh >= 100:
        return 4
    if distance_km < 500 and wind_kmh >= 75:
        return 3
    if distance_km < 700:
        return 2
    return 1


def evaluate_user(user_lat: float, user_lon: float, cyclone: dict) -> dict:
    """
    Returns a dict with: siat_level, siat_color, distance_km, eta_hours,
    reason, and out_of_range (bool).

    When out_of_range is True the caller should skip persisting the assessment
    and sending notifications — the cyclone is too distant to be actionable.
    """
    distance_km = haversine_km(user_lat, user_lon, cyclone["lat"], cyclone["lon"])

    if distance_km > MAX_THREAT_DISTANCE_KM:
        return {
            "siat_level": 1,
            "siat_color": SIAT_COLORS[1],
            "distance_km": round(distance_km, 2),
            "eta_hours": None,
            "reason": (
                f"Ciclón: {cyclone.get('name', '?')} fuera de zona de amenaza "
                f"({distance_km:.0f} km > {MAX_THREAT_DISTANCE_KM} km límite)"
            ),
            "out_of_range": True,
        }

    speed = cyclone.get("movement_speed_kmh") or 0.0

    if speed > 0:
        eta_hours: float | None = distance_km / speed
        level = _level_from_eta(eta_hours)
        eta_label = f"ETA estimada: {eta_hours:.1f}h"
    else:
        eta_hours = None
        level = _level_from_distance(distance_km, cyclone.get("wind_kmh", 0.0))
        eta_label = "ETA: no disponible (ciclón estacionario)"

    reason = " | ".join([
        f"Ciclón: {cyclone.get('name', '?')} ({cyclone.get('status', '?')})",
        f"Distancia: {distance_km:.0f} km",
        f"Vientos: {cyclone.get('wind_kmh', 0):.0f} km/h",
        eta_label,
    ])

    return {
        "siat_level": level,
        "siat_color": SIAT_COLORS[level],
        "distance_km": round(distance_km, 2),
        "eta_hours": round(eta_hours, 2) if eta_hours is not None else None,
        "reason": reason,
        "out_of_range": False,
    }
