"""
Direction/bearing math for SIAT-CT level adjustment.

Cyclone movement direction arrives in two shapes depending on the source:
  - NHC feed: numeric degrees from North as a string (e.g. "270").
  - Fake/injected cyclones: a 16-point compass abbreviation (e.g. "NW").

`parse_movement_direction` normalizes both into a single 0-360 bearing so the
evaluator can compare "where the cyclone is headed" against "where the user
is relative to the cyclone" regardless of which source produced the value.
"""

import math

_COMPASS_POINTS = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
]
_COMPASS_TO_DEGREES = {point: i * 22.5 for i, point in enumerate(_COMPASS_POINTS)}


def parse_movement_direction(value) -> float | None:
    """Normalize a numeric bearing string or a compass abbreviation to degrees [0, 360)."""
    if value is None:
        return None

    text = str(value).strip().upper()
    if not text:
        return None

    if text in _COMPASS_TO_DEGREES:
        return _COMPASS_TO_DEGREES[text]

    try:
        degrees = float(text)
    except ValueError:
        return None

    return degrees % 360


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial great-circle bearing in degrees [0, 360) from point 1 to point 2."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)

    x = math.sin(dlambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)

    theta = math.atan2(x, y)
    return math.degrees(theta) % 360


def angular_difference(bearing_a: float, bearing_b: float) -> float:
    """Smallest angular difference between two bearings, in [0, 180]."""
    diff = abs(bearing_a - bearing_b) % 360
    return diff if diff <= 180 else 360 - diff
