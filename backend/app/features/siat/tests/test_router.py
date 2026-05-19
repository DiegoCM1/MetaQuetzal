import pytest
from unittest.mock import AsyncMock, MagicMock, patch
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


# ---------------------------------------------------------------------------
# run_cycle() respects notification_preferences — service-level tests
# ---------------------------------------------------------------------------

_SVC = "app.features.siat.service"

_FAKE_CYCLONE = {
    "name": "ALBERTO",
    "status": "HU",
    "lat": 22.0,
    "lon": -97.0,
    "wind_kmh": 150.0,
    "movement_speed_kmh": 20.0,
}

_FAKE_USER = {"id": 1, "lat": 20.5, "lon": -98.0}

_ASSESSMENT_LEVEL_2 = {
    "siat_level": 2,
    "siat_color": "VERDE",
    "distance_km": 200.0,
    "eta_hours": 10.0,
    "reason": "test",
    "out_of_range": False,
}

_ASSESSMENT_LEVEL_3 = {
    "siat_level": 3,
    "siat_color": "AMARILLO",
    "distance_km": 200.0,
    "eta_hours": 5.0,
    "reason": "test",
    "out_of_range": False,
}


def _base_run_cycle_patches(assessment, prefs, push_return=0):
    """Return a list of (target, kwargs) patch specs for run_cycle service tests."""
    return [
        patch(f"{_SVC}.fetch_active_cyclones", new_callable=AsyncMock, return_value=[_FAKE_CYCLONE]),
        patch(f"{_SVC}._get_users_with_location", new_callable=AsyncMock, return_value=[_FAKE_USER]),
        patch(f"{_SVC}._save_cyclone", new_callable=AsyncMock, return_value=99),
        patch(f"{_SVC}.evaluate_user", return_value=assessment),
        patch(f"{_SVC}._get_user_state", new_callable=AsyncMock, return_value={"current_level": 1}),
        patch(f"{_SVC}._save_assessment", new_callable=AsyncMock, return_value=None),
        patch(f"{_SVC}._upsert_user_state", new_callable=AsyncMock, return_value=None),
        patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs),
        patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={1: ["token-abc"]}),
        patch(f"{_SVC}._push_per_user", new_callable=AsyncMock, return_value=push_return),
        patch(f"{_SVC}._mark_notified", new_callable=AsyncMock, return_value=None),
        patch(f"{_SVC}._notify_smn_alerts", new_callable=AsyncMock, return_value=0),
    ]


@pytest.mark.asyncio
async def test_run_cycle_respects_siat_disabled():
    """User with siat_enabled=False must not receive push even on valid escalation."""
    from app.features.siat.service import run_cycle

    prefs = {"siat_enabled": False, "min_siat_level": 2, "map_events_enabled": True}
    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_3, prefs, push_return=0)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11]:
        result = await run_cycle(db)

    assert result["notifications_sent"] == 0


@pytest.mark.asyncio
async def test_run_cycle_respects_min_siat_level():
    """User with min_siat_level=3 must not receive push when new_level=2 (Verde)."""
    from app.features.siat.service import run_cycle

    prefs = {"siat_enabled": True, "min_siat_level": 3, "map_events_enabled": True}
    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_2, prefs, push_return=0)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11]:
        result = await run_cycle(db)

    assert result["notifications_sent"] == 0


@pytest.mark.asyncio
async def test_run_cycle_sends_push_when_prefs_allow():
    """User with defaults (siat_enabled=True, min_siat_level=2) must receive push on level-2 escalation."""
    from app.features.siat.service import run_cycle

    prefs = {"siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True}
    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_2, prefs, push_return=1)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11]:
        result = await run_cycle(db)

    assert result["notifications_sent"] == 1


# ---------------------------------------------------------------------------
# SMN/CONAGUA alerts → geocercado push — service-level tests
# ---------------------------------------------------------------------------

_FAKE_SMN_ALERT = {
    "id": "alert-uuid-1",
    "title": "Tormenta severa",
    "short": "Lluvias intensas en la región",
    "level": 3,
    "lat": 20.5,
    "lon": -98.0,
}

_FAKE_USER_NEARBY = {"id": 1, "lat": 20.5, "lon": -98.0}   # 0 km
_FAKE_USER_FAR    = {"id": 2, "lat": 30.0, "lon": -80.0}   # > 500 km


@pytest.mark.asyncio
async def test_smn_recent_alert_user_in_range_sends_and_marks():
    """Recent alert + user inside 500 km + default prefs → push sent and alert marked."""
    from app.features.siat.service import _notify_smn_alerts

    prefs = {"siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True}
    db = MagicMock()

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[_FAKE_SMN_ALERT]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={1: ["token-abc"]}), \
         patch(f"{_SVC}._mark_alert_notified", new_callable=AsyncMock) as mock_mark, \
         patch(f"{_SVC}.messaging") as mock_messaging:

        fake_response = MagicMock()
        fake_response.success_count = 1
        fake_response.failure_count = 0
        fake_response.responses = [MagicMock(success=True)]
        mock_messaging.send_each_for_multicast.return_value = fake_response
        mock_messaging.MulticastMessage = MagicMock()
        mock_messaging.Notification = MagicMock()
        mock_messaging.AndroidConfig = MagicMock()
        mock_messaging.APNSConfig = MagicMock()

        total = await _notify_smn_alerts(db, [_FAKE_USER_NEARBY])

    assert total == 1
    mock_mark.assert_called_once()


@pytest.mark.asyncio
async def test_smn_no_pending_alerts_returns_zero():
    """No pending alerts → _notify_smn_alerts returns 0 without sending anything."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[]):
        total = await _notify_smn_alerts(db, [_FAKE_USER_NEARBY])

    assert total == 0


@pytest.mark.asyncio
async def test_smn_no_users_returns_zero():
    """Empty user list → _notify_smn_alerts returns 0 immediately."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock) as mock_alerts:
        total = await _notify_smn_alerts(db, [])

    assert total == 0
    mock_alerts.assert_not_called()


@pytest.mark.asyncio
async def test_smn_user_out_of_range_no_push():
    """User beyond 500 km → push skipped and alert NOT marked as notified."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()
    prefs = {"siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True}

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[_FAKE_SMN_ALERT]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={}) as mock_tokens, \
         patch(f"{_SVC}._mark_alert_notified", new_callable=AsyncMock) as mock_mark:

        total = await _notify_smn_alerts(db, [_FAKE_USER_FAR])

    assert total == 0
    mock_mark.assert_not_called()


@pytest.mark.asyncio
async def test_smn_siat_disabled_no_push():
    """User with siat_enabled=False → push filtered even if inside radius."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()
    prefs = {"siat_enabled": False, "min_siat_level": 2, "map_events_enabled": True}

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[_FAKE_SMN_ALERT]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={}) as mock_tokens, \
         patch(f"{_SVC}._mark_alert_notified", new_callable=AsyncMock) as mock_mark:

        total = await _notify_smn_alerts(db, [_FAKE_USER_NEARBY])

    assert total == 0
    mock_mark.assert_not_called()


@pytest.mark.asyncio
async def test_smn_min_siat_level_filters_alert():
    """Alert level=2 but user min_siat_level=3 → push filtered."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()
    prefs = {"siat_enabled": True, "min_siat_level": 3, "map_events_enabled": True}

    alert_level2 = {**_FAKE_SMN_ALERT, "level": 2}

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[alert_level2]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={}) as mock_tokens, \
         patch(f"{_SVC}._mark_alert_notified", new_callable=AsyncMock) as mock_mark:

        total = await _notify_smn_alerts(db, [_FAKE_USER_NEARBY])

    assert total == 0
    mock_mark.assert_not_called()
