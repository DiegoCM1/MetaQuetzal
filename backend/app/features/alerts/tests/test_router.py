from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}

# Patch targets must reference WHERE the name is used (the router module),
# not where the function is defined, because `from x import y` binds a local name.
_ROUTER = "app.features.alerts.router"


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


# ---------------------------------------------------------------------------
# GET /api/v1/alerts
# ---------------------------------------------------------------------------

def test_list_alerts_returns_200():
    with _mock_auth():
        with patch(f"{_ROUTER}.get_alerts", new_callable=AsyncMock, return_value=[]):
            r = client.get("/api/v1/alerts", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_alerts_requires_auth():
    r = client.get("/api/v1/alerts")
    assert r.status_code == 422  # missing Authorization header


# ---------------------------------------------------------------------------
# GET /api/v1/alerts/active
# ---------------------------------------------------------------------------

def test_alerts_active_returns_structure():
    fake_db_user = {"id": 1, "firebase_uid": "firebase-test-uid", "lat": 19.4, "lon": -99.1}
    fake_siat = {
        "current_level": 1,
        "siat_color": "AZUL",
        "updated_at": "2026-04-23T06:00:00+00:00",
    }
    with _mock_auth():
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=fake_db_user):
            with patch(f"{_ROUTER}.get_user_siat_state", new_callable=AsyncMock, return_value=fake_siat):
                with patch(f"{_ROUTER}.get_alerts", new_callable=AsyncMock, return_value=[]):
                    with patch(f"{_ROUTER}.fetch_latest_bulletin", new_callable=AsyncMock, return_value=None):
                        r = client.get("/api/v1/alerts/active", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert "user_siat" in body
    assert "cyclonic_alerts" in body
    assert "general_alerts" in body
    assert "smn_bulletin" in body


def test_alerts_active_no_profile_still_returns_200():
    """User without profile should still get a valid (empty) response."""
    with _mock_auth():
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            with patch(f"{_ROUTER}.get_alerts", new_callable=AsyncMock, return_value=[]):
                with patch(f"{_ROUTER}.fetch_latest_bulletin", new_callable=AsyncMock, return_value=None):
                    r = client.get("/api/v1/alerts/active", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["user_siat"] is None
    assert body["cyclonic_alerts"] == []


def test_alerts_active_has_generated_at():
    """generated_at must be present and parseable in /active response."""
    from datetime import datetime
    with _mock_auth():
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            with patch(f"{_ROUTER}.get_alerts", new_callable=AsyncMock, return_value=[]):
                with patch(f"{_ROUTER}.fetch_latest_bulletin", new_callable=AsyncMock, return_value=None):
                    r = client.get("/api/v1/alerts/active", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert "generated_at" in body
    assert body["generated_at"] is not None
    # Must be a valid ISO datetime string
    datetime.fromisoformat(body["generated_at"].replace("Z", "+00:00"))


def test_alerts_active_smn_failure_does_not_break():
    """SMN raising an exception must not break /active — smn_bulletin is null, status 200."""
    with _mock_auth():
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            with patch(f"{_ROUTER}.get_alerts", new_callable=AsyncMock, return_value=[]):
                with patch(
                    f"{_ROUTER}.fetch_latest_bulletin",
                    new_callable=AsyncMock,
                    side_effect=Exception("network error"),
                ):
                    r = client.get("/api/v1/alerts/active", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["smn_bulletin"] is None


# ---------------------------------------------------------------------------
# GET /api/v1/alerts/weather/mx
# ---------------------------------------------------------------------------

def test_weather_mx_partial_failure_returns_200():
    """If one OpenWeather point raises an exception, remaining points are returned (no 502)."""
    good_data = {
        "timezone": "America/Mexico_City",
        "timezone_offset": -21600,
        "current": {
            "temp": 28.0,
            "humidity": 70,
            "pressure": 1010,
            "wind_speed": 5.0,
            "wind_deg": 180,
            "weather": [{"main": "Clear", "description": "cielo despejado"}],
        },
        "alerts": [],
    }
    call_count = {"n": 0}

    async def _patched_fetch(client, lat, lon, exclude=None):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise Exception("simulated OpenWeather timeout")
        return good_data

    with _mock_auth():
        with patch(
            "app.features.alerts.openweather_service._fetch_onecall_data",
            side_effect=_patched_fetch,
        ):
            r = client.get("/api/v1/alerts/weather/mx", headers=AUTH_HEADERS)

    assert r.status_code == 200
    body = r.json()
    # One point failed — the other 11 must still be present
    assert body["points_count"] == 11
    assert len(body["points"]) == 11
