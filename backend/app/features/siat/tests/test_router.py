from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app
from datetime import datetime, timezone

client = TestClient(app)

API_KEY_HEADERS = {"X-Api-Key": "s3cret-xyz"}

# Patch targets must reference WHERE the name is used (router module)
_ROUTER = "app.features.siat.router"

FAKE_CYCLE_RESULT = {
    "cyclones_found": 0,
    "users_evaluated": 0,
    "notifications_sent": 0,
    "assessments": [],
}

FAKE_SIAT_STATUS = {
    "user_id": 1,
    "current_level": 2,
    "siat_color": "VERDE",
    "last_notified_level": None,
    "last_notified_at": None,
    "active_cyclone_id": None,
    "updated_at": datetime.now(timezone.utc),
}


# ---------------------------------------------------------------------------
# Router tests
# ---------------------------------------------------------------------------

def test_siat_run_cycle_no_cyclones():
    with patch(f"{_ROUTER}.run_cycle", new_callable=AsyncMock, return_value=FAKE_CYCLE_RESULT):
        r = client.post("/api/v1/siat/run-cycle", headers=API_KEY_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["cyclones_found"] == 0
    assert body["notifications_sent"] == 0


def test_siat_run_cycle_requires_api_key():
    r = client.post("/api/v1/siat/run-cycle")
    assert r.status_code == 422  # missing X-Api-Key


def test_siat_run_cycle_wrong_key():
    r = client.post("/api/v1/siat/run-cycle", headers={"X-Api-Key": "wrong"})
    assert r.status_code == 401


def test_siat_user_status_returns_level():
    with patch(f"{_ROUTER}.get_user_siat_status", new_callable=AsyncMock, return_value=FAKE_SIAT_STATUS):
        r = client.get("/api/v1/siat/status/1", headers=API_KEY_HEADERS)
    assert r.status_code == 200
    assert r.json()["siat_color"] == "VERDE"


def test_siat_user_status_404():
    with patch(f"{_ROUTER}.get_user_siat_status", new_callable=AsyncMock, return_value=None):
        r = client.get("/api/v1/siat/status/99", headers=API_KEY_HEADERS)
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# Evaluator unit tests (no TestClient / DB needed)
# ---------------------------------------------------------------------------

from app.features.siat.evaluator import evaluate_user, MAX_THREAT_DISTANCE_KM, haversine_km


def test_evaluate_user_out_of_range_is_flagged():
    """Cyclone beyond MAX_THREAT_DISTANCE_KM must return out_of_range=True and level 1."""
    far_cyclone = {
        "name": "FERNANDA",
        "status": "HU",
        "lat": 60.0,    # well north of Mexico
        "lon": -20.0,   # mid-Atlantic
        "wind_kmh": 200.0,
        "movement_speed_kmh": 20.0,
    }
    # Mexico City approximate coordinates
    result = evaluate_user(19.4, -99.1, far_cyclone)

    assert result["out_of_range"] is True
    assert result["siat_level"] == 1
    assert result["distance_km"] > MAX_THREAT_DISTANCE_KM


def test_evaluate_user_in_range_is_not_flagged():
    """Cyclone within MAX_THREAT_DISTANCE_KM must NOT be flagged as out_of_range."""
    nearby_cyclone = {
        "name": "ALBERTO",
        "status": "HU",
        "lat": 22.0,
        "lon": -97.0,
        "wind_kmh": 150.0,
        "movement_speed_kmh": 20.0,
    }
    result = evaluate_user(19.4, -99.1, nearby_cyclone)
    assert result["out_of_range"] is False


def test_evaluate_user_stationary_cat4_nearby_is_high_risk():
    """
    Stationary Cat-4 hurricane at ~240 km must resolve to NARANJA (4) or higher.
    Old distance thresholds gave the same result for moving cyclones but the new
    stationary thresholds are more conservative: < 300 km + >= 100 km/h → level 4.
    """
    stationary_cat4 = {
        "name": "BERTHA",
        "status": "HU",
        "lat": 20.5,
        "lon": -97.0,   # ~240 km from Mexico City
        "wind_kmh": 185.0,  # Cat 4
        "movement_speed_kmh": 0.0,  # stationary
    }
    result = evaluate_user(19.4, -99.1, stationary_cat4)

    assert result["out_of_range"] is False
    assert result["siat_level"] >= 4   # NARANJA or ROJO
    assert result["eta_hours"] is None  # stationary → no ETA


def test_evaluate_user_stationary_very_close_is_rojo():
    """Stationary Cat-4 at < 150 km with >= 150 km/h winds must be ROJO (5)."""
    stationary_close = {
        "name": "CARLOS",
        "status": "HU",
        "lat": 20.2,
        "lon": -98.8,   # ~90 km from Mexico City approximate
        "wind_kmh": 200.0,
        "movement_speed_kmh": 0.0,
    }
    result = evaluate_user(19.4, -99.1, stationary_close)

    dist = result["distance_km"]
    if dist < 150:
        assert result["siat_level"] == 5  # ROJO
    else:
        # If coordinates produce a slightly larger distance, still >= 4
        assert result["siat_level"] >= 4


def test_evaluate_user_fast_approaching_is_rojo():
    """Fast cyclone with ETA < 6h must return ROJO (5)."""
    fast_cyclone = {
        "name": "DIANA",
        "status": "HU",
        "lat": 20.0,
        "lon": -99.0,   # ~67 km from Mexico City approximate
        "wind_kmh": 180.0,
        "movement_speed_kmh": 30.0,  # ETA ≈ 2.2h → ROJO
    }
    result = evaluate_user(19.4, -99.1, fast_cyclone)

    assert result["out_of_range"] is False
    assert result["siat_level"] == 5
    assert result["siat_color"] == "ROJO"
    assert result["eta_hours"] is not None
    assert result["eta_hours"] < 6.0


def test_evaluate_user_distant_slow_cyclone_is_azul():
    """Cyclone at 800 km (within range) moving slowly → level 1 or 2."""
    slow_distant = {
        "name": "ELENA",
        "status": "TS",
        "lat": 26.0,
        "lon": -94.0,   # ~800 km from Mexico City
        "wind_kmh": 90.0,
        "movement_speed_kmh": 10.0,  # ETA ≈ 80h → AZUL
    }
    result = evaluate_user(19.4, -99.1, slow_distant)

    assert result["out_of_range"] is False
    assert result["siat_level"] <= 2  # AZUL or VERDE


# ---------------------------------------------------------------------------
# GET /api/v1/siat/affected-users
# ---------------------------------------------------------------------------

_FAKE_AFFECTED = [
    {"user_id": 1, "distance_km": 120.5},
    {"user_id": 4, "distance_km": 340.2},
]


def test_affected_users_happy_path():
    with patch(f"{_ROUTER}.get_affected_users", new_callable=AsyncMock, return_value=_FAKE_AFFECTED):
        r = client.get(
            "/api/v1/siat/affected-users",
            params={"lat": 20.5, "lon": -98.0},
            headers=API_KEY_HEADERS,
        )
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert body["users"][0]["user_id"] == 1
    assert body["users"][0]["distance_km"] == 120.5


def test_affected_users_empty_radius():
    with patch(f"{_ROUTER}.get_affected_users", new_callable=AsyncMock, return_value=[]):
        r = client.get(
            "/api/v1/siat/affected-users",
            params={"lat": 20.5, "lon": -98.0, "radius_km": 10},
            headers=API_KEY_HEADERS,
        )
    assert r.status_code == 200
    assert r.json() == {"total": 0, "users": []}


def test_affected_users_requires_api_key():
    r = client.get("/api/v1/siat/affected-users", params={"lat": 20.5, "lon": -98.0})
    assert r.status_code == 422


def test_affected_users_wrong_api_key():
    r = client.get(
        "/api/v1/siat/affected-users",
        params={"lat": 20.5, "lon": -98.0},
        headers={"X-Api-Key": "wrong"},
    )
    assert r.status_code == 401


def test_affected_users_invalid_radius():
    r = client.get(
        "/api/v1/siat/affected-users",
        params={"lat": 20.5, "lon": -98.0, "radius_km": 0},
        headers=API_KEY_HEADERS,
    )
    assert r.status_code == 422
