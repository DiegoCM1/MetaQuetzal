"""
NHC (National Hurricane Center) provider.
Fetches active tropical cyclones from the public NHC JSON feed — no auth required.

Official field reference (PDF):
  https://www.nhc.noaa.gov/productexamples/NHC_Tropical_Cyclone_Status_JSON_File_Reference.pdf

The PDF documents `latitude_numeric` / `longitude_numeric` (snake_case), but the
LIVE feed actually serves `latitudeNumeric` / `longitudeNumeric` (camelCase) —
verified directly against https://www.nhc.noaa.gov/CurrentStorms.json. Using the
PDF's snake_case names here silently defaulted lat/lon to 0.0 for every real
storm (dict.get with a default never raises), which made every cyclone appear
~10,000 km away and skip SIAT-CT's proximity evaluation entirely. Trust the live
feed's actual keys over the PDF for lat/lon.

Key field notes:
  - latitudeNumeric / longitudeNumeric  (decimal degrees, numeric — LIVE feed casing)
  - intensity       wind speed in KNOTS
  - pressure        mean sea level pressure in millibars
  - movementDir     degrees from North (numeric)
  - movementSpeed   storm movement speed in MPH (not knots)
  - classification  TD | TS | HU | STS | STD | PTC | TY | PC
"""

import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

NHC_URL = "https://www.nhc.noaa.gov/CurrentStorms.json"

_KNOTS_TO_KMH = 1.852
_MPH_TO_KMH = 1.60934


async def fetch_active_cyclones() -> list[dict]:
    """
    Returns a list of normalized cyclone dicts.
    Returns empty list when no storms are active or the feed is unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(NHC_URL)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error("NHC feed returned HTTP %s: %s", exc.response.status_code, exc.response.text[:200])
        return []
    except httpx.TimeoutException:
        logger.error("NHC feed timed out after 15s")
        return []
    except Exception as exc:
        logger.error("Unexpected error fetching NHC feed: %s", exc, exc_info=True)
        return []

    raw_storms = data.get("activeStorms", [])
    logger.info("NHC feed: %d active storm(s) found", len(raw_storms))

    cyclones = []
    for storm in raw_storms:
        try:
            cyclones.append(_normalize(storm))
        except (KeyError, TypeError, ValueError) as exc:
            logger.warning("Skipping malformed storm entry (%s): %s", exc, storm)
            continue

    return cyclones


def _normalize(storm: dict) -> dict:
    # No default on the dict lookups: a missing lat/lon must raise KeyError and
    # get skipped+logged by the caller, not silently default to 0.0 (which is
    # how the original bug went undetected — every real storm looked like it
    # was sitting in the Gulf of Guinea, ~10,000 km from any Mexican user).
    lat = float(storm["latitudeNumeric"])
    lon = float(storm["longitudeNumeric"])
    if lat == 0.0 and lon == 0.0:
        # The field can be *present* but transiently zeroed — observed live
        # against the real feed, presumably a race on NHC's end while their
        # file regenerates. (0, 0) is not a plausible position for any storm
        # this feed tracks, so treat it exactly like a missing field: raise
        # and let the caller skip+log this entry instead of saving garbage
        # that would make the storm look ~10,000 km away from everyone.
        raise ValueError(f"Implausible (0, 0) position for storm {storm.get('name', '?')!r} — likely a transient feed glitch")

    return {
        "source": "NHC",
        "name": storm.get("name", "Unknown"),
        "status": storm.get("classification", "Unknown"),
        "lat": lat,
        "lon": lon,
        # intensity is in knots → convert to km/h
        "wind_kmh": float(storm.get("intensity", 0) or 0) * _KNOTS_TO_KMH,
        # pressure field is named exactly "pressure" in the official schema
        "pressure": _safe_int(storm.get("pressure")),
        # movementDir is degrees from North
        "movement_direction": _safe_str(storm.get("movementDir")),
        # movementSpeed is in MPH → convert to km/h
        "movement_speed_kmh": float(storm.get("movementSpeed", 0) or 0) * _MPH_TO_KMH,
        "advisory_time": datetime.now(timezone.utc),
        "raw_payload": storm,
    }


def _safe_int(val) -> int | None:
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _safe_str(val) -> str | None:
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None
