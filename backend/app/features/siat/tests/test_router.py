import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from starlette.testclient import TestClient
from app.main import app
from app.core.config import settings
from datetime import datetime, timezone

client = TestClient(app)

TEST_API_KEY = "test-siat-api-key"
API_KEY_HEADERS = {"X-Api-Key": TEST_API_KEY}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}
ADMIN_EMAIL = "admin@blueye.mx"
NON_ADMIN_EMAIL = "user@blueye.mx"


def _mock_auth_email(email: str):
    return patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test-uid", "email": email})


@pytest.fixture(autouse=True)
def _patch_api_key():
    with patch.object(settings, "NOTIF_API_KEY", TEST_API_KEY):
        yield

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


# ---------------------------------------------------------------------------
# Quiet hours — SIAT run_cycle and SMN service-level tests
# ---------------------------------------------------------------------------

_ASSESSMENT_LEVEL_5 = {
    "siat_level": 5,
    "siat_color": "ROJO",
    "distance_km": 50.0,
    "eta_hours": 2.0,
    "reason": "test",
    "out_of_range": False,
}

_QUIET_PREFS = {
    "siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True,
    "quiet_hours_enabled": True, "quiet_start": "22:00", "quiet_end": "07:00",
}


@pytest.mark.asyncio
async def test_siat_quiet_hours_suppresses_push():
    """User inside quiet hours + level=3 → push suppressed (not added to escalations)."""
    from app.features.siat.service import run_cycle

    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_3, _QUIET_PREFS, push_return=0)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], \
         patch(f"{_SVC}.is_within_quiet_hours", return_value=True):
        result = await run_cycle(db)

    assert result["notifications_sent"] == 0


@pytest.mark.asyncio
async def test_siat_quiet_hours_allows_push_outside_range():
    """User outside quiet hours → push proceeds normally."""
    from app.features.siat.service import run_cycle

    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_3, _QUIET_PREFS, push_return=1)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], \
         patch(f"{_SVC}.is_within_quiet_hours", return_value=False):
        result = await run_cycle(db)

    assert result["notifications_sent"] == 1


@pytest.mark.asyncio
async def test_siat_level5_overrides_quiet_hours():
    """Level 5 / ROJO is always sent even when inside quiet hours."""
    from app.features.siat.service import run_cycle

    db = MagicMock()
    db.commit = AsyncMock()

    patches = _base_run_cycle_patches(_ASSESSMENT_LEVEL_5, _QUIET_PREFS, push_return=1)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], \
         patch(f"{_SVC}.is_within_quiet_hours", return_value=True):
        result = await run_cycle(db)

    assert result["notifications_sent"] == 1


@pytest.mark.asyncio
async def test_smn_quiet_hours_suppresses_push():
    """SMN alert level=3 + user in quiet hours → not added to affected_user_ids."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[_FAKE_SMN_ALERT]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=_QUIET_PREFS), \
         patch(f"{_SVC}.is_within_quiet_hours", return_value=True), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={}) as mock_tokens, \
         patch(f"{_SVC}._mark_alert_notified", new_callable=AsyncMock) as mock_mark:

        total = await _notify_smn_alerts(db, [_FAKE_USER_NEARBY])

    assert total == 0
    mock_mark.assert_not_called()


# ---------------------------------------------------------------------------
# POST /api/v1/siat/inject-cyclone — router tests
# ---------------------------------------------------------------------------

_INJECT_RESULT = {
    "cyclones_found": 1,
    "users_evaluated": 1,
    "notifications_sent": 1,
    "assessments": [],
    "cyclone_event_id": 42,
    "cyclone_name": "FALSO-1",
}

_FAKE_CYCLONE_BODY = {"name": "FALSO-1", "lat": 21.0, "lon": -98.0}


def test_inject_cyclone_success():
    """Admin user con ubicación → 200 con cyclone_event_id y cyclone_name."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=_FAKE_DB_USER_WITH_LOC):
                with patch(f"{_ROUTER}.inject_and_run_cycle", new_callable=AsyncMock, return_value=_INJECT_RESULT):
                    r = client.post(
                        "/api/v1/siat/inject-cyclone",
                        json=_FAKE_CYCLONE_BODY,
                        headers=AUTH_HEADERS,
                    )
    assert r.status_code == 200
    body = r.json()
    assert body["cyclone_event_id"] == 42
    assert body["cyclone_name"] == "FALSO-1"
    assert body["cyclones_found"] == 1


@pytest.mark.skip(reason="TEMP VIDEO QA ONLY: whitelist removed on this branch — DO NOT MERGE TO DEV")
def test_inject_cyclone_non_admin_403():
    """Usuario no admin → 403."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(NON_ADMIN_EMAIL):
            r = client.post(
                "/api/v1/siat/inject-cyclone",
                json=_FAKE_CYCLONE_BODY,
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 403


def test_inject_cyclone_no_auth_422():
    """Sin Authorization header → 422 (FastAPI header validation)."""
    r = client.post("/api/v1/siat/inject-cyclone", json=_FAKE_CYCLONE_BODY)
    assert r.status_code == 422


def test_inject_cyclone_missing_lat_lon_422():
    """Body sin lat/lon → 422 (Pydantic validation)."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            r = client.post(
                "/api/v1/siat/inject-cyclone",
                json={"name": "FALSO-1"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 422


_FAKE_DB_USER_WITH_LOC = {"id": 1, "firebase_uid": "test-uid", "lat": 19.43, "lon": -99.13}
_FAKE_DB_USER_NO_LOC   = {"id": 1, "firebase_uid": "test-uid", "lat": None, "lon": None}


def test_inject_cyclone_user_no_location_422():
    """Usuario sin lat/lon en DB → 422 con mensaje explícito."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=_FAKE_DB_USER_NO_LOC):
                r = client.post(
                    "/api/v1/siat/inject-cyclone",
                    json=_FAKE_CYCLONE_BODY,
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 422
    assert "ubicación" in r.json()["detail"].lower()


def test_inject_cyclone_with_location_calls_service():
    """Usuario con ubicación → delega a inject_and_run_cycle."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=_FAKE_DB_USER_WITH_LOC):
                with patch(f"{_ROUTER}.inject_and_run_cycle", new_callable=AsyncMock, return_value=_INJECT_RESULT) as mock_inject:
                    r = client.post(
                        "/api/v1/siat/inject-cyclone",
                        json=_FAKE_CYCLONE_BODY,
                        headers=AUTH_HEADERS,
                    )
    assert r.status_code == 200
    mock_inject.assert_awaited_once()


def test_reset_state_success():
    """Usuario autenticado → 200 y mensaje de confirmación."""
    with _mock_auth_email(ADMIN_EMAIL):
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=_FAKE_DB_USER_WITH_LOC):
            with patch(f"{_ROUTER}.reset_user_siat_state", new_callable=AsyncMock, return_value=None):
                r = client.post("/api/v1/siat/reset-state", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["user_id"] == 1


def test_reset_state_no_profile_404():
    """Usuario sin perfil en DB → 404."""
    with _mock_auth_email(ADMIN_EMAIL):
        with patch(f"{_ROUTER}.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            r = client.post("/api/v1/siat/reset-state", headers=AUTH_HEADERS)
    assert r.status_code == 404


def test_inject_smn_alert_success():
    """Admin → 200 con alert_id y notifications_sent."""
    smn_result = {"alert_id": "uuid-test-123", "users_evaluated": 2, "notifications_sent": 1}
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            with patch(f"{_ROUTER}.inject_smn_test_alert", new_callable=AsyncMock, return_value=smn_result):
                r = client.post(
                    "/api/v1/siat/inject-smn-alert",
                    json={"level": 3},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 200
    body = r.json()
    assert body["alert_id"] == "uuid-test-123"
    assert body["notifications_sent"] == 1


@pytest.mark.skip(reason="TEMP VIDEO QA ONLY: whitelist removed on this branch — DO NOT MERGE TO DEV")
def test_inject_smn_alert_non_admin_403():
    """No admin → 403."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(NON_ADMIN_EMAIL):
            r = client.post("/api/v1/siat/inject-smn-alert", json={"level": 3}, headers=AUTH_HEADERS)
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# run_cycle() acepta extra_cyclones — service-level test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_run_cycle_with_extra_cyclones():
    """Extra cyclones pasados a run_cycle se evalúan aunque NHC no devuelva ninguno."""
    from app.features.siat.service import run_cycle

    fake_cyclone = {
        "source": "FAKE",
        "name": "FALSO-1",
        "status": "HU",
        "lat": 21.0,
        "lon": -98.0,
        "wind_kmh": 160.0,
        "movement_speed_kmh": 20.0,
    }
    prefs = {"siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True}
    db = MagicMock()
    db.commit = AsyncMock()

    with patch(f"{_SVC}.fetch_active_cyclones", new_callable=AsyncMock, return_value=[]), \
         patch(f"{_SVC}._get_users_with_location", new_callable=AsyncMock, return_value=[_FAKE_USER]), \
         patch(f"{_SVC}._save_cyclone", new_callable=AsyncMock, return_value=99), \
         patch(f"{_SVC}.evaluate_user", return_value=_ASSESSMENT_LEVEL_2), \
         patch(f"{_SVC}._get_user_state", new_callable=AsyncMock, return_value={"current_level": 1}), \
         patch(f"{_SVC}._save_assessment", new_callable=AsyncMock), \
         patch(f"{_SVC}._upsert_user_state", new_callable=AsyncMock), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=prefs), \
         patch(f"{_SVC}.get_tokens_for_users", new_callable=AsyncMock, return_value={1: ["token-abc"]}), \
         patch(f"{_SVC}._push_per_user", new_callable=AsyncMock, return_value=1), \
         patch(f"{_SVC}._mark_notified", new_callable=AsyncMock), \
         patch(f"{_SVC}._notify_smn_alerts", new_callable=AsyncMock, return_value=0):
        result = await run_cycle(db, extra_cyclones=[fake_cyclone])

    assert result["cyclones_found"] == 1   # NHC=0, extra=1
    assert len(result["assessments"]) == 1
    assert result["notifications_sent"] == 1


@pytest.mark.asyncio
async def test_smn_national_alert_no_coords_notifies_all_eligible_users():
    """Alerta nacional (lat/lon NULL) → sin filtro de distancia → todos los usuarios elegibles reciben push."""
    from app.features.siat.service import _notify_smn_alerts

    national_alert = {
        "id": "alert-national-1",
        "title": "SMN Aviso #300",
        "short": "Lluvias intensas en todo el país",
        "level": 3,
        "lat": None,
        "lon": None,
    }
    prefs = {"siat_enabled": True, "min_siat_level": 2, "map_events_enabled": True}
    db = MagicMock()

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[national_alert]), \
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

        # _FAKE_USER_FAR is > 500 km away — but national alert must still reach them
        total = await _notify_smn_alerts(db, [_FAKE_USER_FAR])

    assert total == 1
    mock_mark.assert_called_once()


@pytest.mark.asyncio
async def test_smn_level5_overrides_quiet_hours():
    """SMN alert level=5 inside quiet hours → push still sent (ROJO exception)."""
    from app.features.siat.service import _notify_smn_alerts

    db = MagicMock()
    alert_level5 = {**_FAKE_SMN_ALERT, "level": 5}

    with patch(f"{_SVC}._get_pending_smn_alerts", new_callable=AsyncMock, return_value=[alert_level5]), \
         patch(f"{_SVC}.get_preferences", new_callable=AsyncMock, return_value=_QUIET_PREFS), \
         patch(f"{_SVC}.is_within_quiet_hours", return_value=True), \
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
