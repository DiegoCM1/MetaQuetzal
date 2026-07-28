import pytest
from unittest.mock import AsyncMock, patch

from app.features.siat.providers.nhc import _normalize, fetch_active_cyclones

# Shape of a real entry from https://www.nhc.noaa.gov/CurrentStorms.json
# (verified live 2026-07-25) — the live feed uses camelCase for lat/lon,
# NOT the snake_case latitude_numeric/longitude_numeric the official PDF
# documents. This regression-tests the bug where the mismatch silently
# defaulted every real storm's position to (0.0, 0.0).
_REAL_STORM_PAYLOAD = {
    "id": "ep062026",
    "name": "Fausto",
    "classification": "HU",
    "intensity": "85",
    "pressure": "971",
    "latitude": "19.1N",
    "longitude": "136.5W",
    "latitudeNumeric": 19.1,
    "longitudeNumeric": -136.5,
    "movementDir": 280,
    "movementSpeed": 14,
}


def test_normalize_parses_live_feed_camel_case_lat_lon():
    result = _normalize(_REAL_STORM_PAYLOAD)

    assert result["lat"] == 19.1
    assert result["lon"] == -136.5
    assert result["name"] == "Fausto"
    assert result["status"] == "HU"


def test_normalize_wind_and_movement_conversions():
    result = _normalize(_REAL_STORM_PAYLOAD)

    assert result["wind_kmh"] == pytest.approx(85 * 1.852)
    assert result["movement_speed_kmh"] == pytest.approx(14 * 1.60934)
    assert result["pressure"] == 971


def test_normalize_missing_lat_lon_raises_keyerror():
    """A storm entry with no lat/lon must fail loudly (KeyError), not silently
    default to (0.0, 0.0) — the caller (fetch_active_cyclones) catches this
    and skips+logs the entry instead of feeding bogus data into SIAT-CT."""
    broken_payload = {k: v for k, v in _REAL_STORM_PAYLOAD.items() if "atitude" not in k.lower()}
    with pytest.raises(KeyError):
        _normalize(broken_payload)


def test_normalize_zero_zero_position_raises_valueerror():
    """
    Regression test: observed live against the real NHC feed on 2026-07-26 —
    a storm's latitudeNumeric/longitudeNumeric fields were BOTH PRESENT but
    transiently 0 (presumably a race on NHC's end while their file
    regenerates), which the KeyError guard alone doesn't catch since the keys
    exist. (0, 0) is not a plausible position for any storm this feed tracks,
    so it must be rejected the same way a missing field is — not saved as if
    it were real, which would make the storm look ~10,000 km from everyone.
    """
    zeroed_payload = {**_REAL_STORM_PAYLOAD, "latitudeNumeric": 0.0, "longitudeNumeric": 0.0}
    with pytest.raises(ValueError):
        _normalize(zeroed_payload)


@pytest.mark.asyncio
async def test_fetch_active_cyclones_skips_malformed_entry_without_crashing():
    """One malformed entry (missing lat/lon) must not take down the whole feed —
    the other, well-formed entry still comes through."""
    good_payload = dict(_REAL_STORM_PAYLOAD)
    malformed_payload = {"name": "Broken", "classification": "TD"}  # no lat/lon at all

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: {"activeStorms": [good_payload, malformed_payload]}

        cyclones = await fetch_active_cyclones()

    assert len(cyclones) == 1
    assert cyclones[0]["name"] == "Fausto"
    assert cyclones[0]["lat"] == 19.1


@pytest.mark.asyncio
async def test_fetch_active_cyclones_skips_zeroed_entry_without_crashing():
    """A (0, 0) entry (transient NHC feed glitch) must be skipped, not saved as
    the storm's real position — the other, well-formed entry still comes through."""
    good_payload = dict(_REAL_STORM_PAYLOAD)
    zeroed_payload = {**_REAL_STORM_PAYLOAD, "name": "Glitched", "latitudeNumeric": 0.0, "longitudeNumeric": 0.0}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value.raise_for_status = lambda: None
        mock_get.return_value.json = lambda: {"activeStorms": [good_payload, zeroed_payload]}

        cyclones = await fetch_active_cyclones()

    assert len(cyclones) == 1
    assert cyclones[0]["name"] == "Fausto"
