from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app
from datetime import datetime, timezone

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}

FAKE_DB_USER = {
    "id": 42,
    "firebase_uid": "firebase-test-uid",
    "lat": None,
    "lon": None,
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}

DEFAULT_PREFS = {
    "siat_enabled": True,
    "min_siat_level": 2,
    "map_events_enabled": True,
    "quiet_hours_enabled": False,
    "quiet_start": None,
    "quiet_end": None,
    "nervousness_level": 5,
    "weather_info_level": 5,
}

CUSTOM_PREFS = {
    "siat_enabled": False,
    "min_siat_level": 3,
    "map_events_enabled": True,
    "quiet_hours_enabled": False,
    "quiet_start": None,
    "quiet_end": None,
    "nervousness_level": 5,
    "weather_info_level": 5,
}


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


# ── GET ────────────────────────────────────────────────────────────────────────

def test_get_preferences_returns_defaults_when_no_record():
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.get_preferences",
                new_callable=AsyncMock,
                return_value=DEFAULT_PREFS,
            ):
                r = client.get("/api/v1/notification-preferences", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json() == DEFAULT_PREFS


def test_get_preferences_returns_stored_values():
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.get_preferences",
                new_callable=AsyncMock,
                return_value=CUSTOM_PREFS,
            ):
                r = client.get("/api/v1/notification-preferences", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["siat_enabled"] is False
    assert r.json()["min_siat_level"] == 3


def test_get_preferences_404_when_user_not_found():
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=None,
        ):
            r = client.get("/api/v1/notification-preferences", headers=AUTH_HEADERS)
    assert r.status_code == 404


def test_get_preferences_requires_auth():
    r = client.get("/api/v1/notification-preferences")
    assert r.status_code == 422


# ── PATCH ──────────────────────────────────────────────────────────────────────

def test_patch_preferences_updates_partial_fields():
    updated = {**DEFAULT_PREFS, "siat_enabled": False}
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.upsert_preferences",
                new_callable=AsyncMock,
                return_value=updated,
            ) as mock_upsert:
                r = client.patch(
                    "/api/v1/notification-preferences",
                    json={"siat_enabled": False},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 200
    assert r.json()["siat_enabled"] is False
    # Only the provided field was passed as updates (positional arg index 2)
    mock_upsert.assert_called_once()
    assert mock_upsert.call_args[0][2] == {"siat_enabled": False}


def test_patch_preferences_creates_new_record():
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.upsert_preferences",
                new_callable=AsyncMock,
                return_value=CUSTOM_PREFS,
            ):
                r = client.patch(
                    "/api/v1/notification-preferences",
                    json={"siat_enabled": False, "min_siat_level": 3},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 200
    assert r.json() == CUSTOM_PREFS


def test_patch_preferences_404_when_user_not_found():
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=None,
        ):
            r = client.patch(
                "/api/v1/notification-preferences",
                json={"siat_enabled": False},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 404


def test_patch_preferences_requires_auth():
    r = client.patch("/api/v1/notification-preferences", json={"siat_enabled": False})
    assert r.status_code == 422


# ── Quiet hours ────────────────────────────────────────────────────────────────

def test_get_preferences_includes_quiet_fields():
    prefs_with_quiet = {**DEFAULT_PREFS, "quiet_hours_enabled": True, "quiet_start": "22:00", "quiet_end": "07:00"}
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.get_preferences",
                new_callable=AsyncMock,
                return_value=prefs_with_quiet,
            ):
                r = client.get("/api/v1/notification-preferences", headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["quiet_hours_enabled"] is True
    assert body["quiet_start"] == "22:00"
    assert body["quiet_end"] == "07:00"


def test_patch_quiet_hours_full_payload():
    updated = {**DEFAULT_PREFS, "quiet_hours_enabled": True, "quiet_start": "22:00", "quiet_end": "07:00"}
    with _mock_auth():
        with patch(
            "app.features.notification_preferences.router.get_user_by_firebase_uid",
            new_callable=AsyncMock,
            return_value=FAKE_DB_USER,
        ):
            with patch(
                "app.features.notification_preferences.router.upsert_preferences",
                new_callable=AsyncMock,
                return_value=updated,
            ):
                r = client.patch(
                    "/api/v1/notification-preferences",
                    json={"quiet_hours_enabled": True, "quiet_start": "22:00", "quiet_end": "07:00"},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 200
    body = r.json()
    assert body["quiet_hours_enabled"] is True
    assert body["quiet_start"] == "22:00"
    assert body["quiet_end"] == "07:00"


def test_patch_quiet_hours_invalid_time_format():
    with _mock_auth():
        r = client.patch(
            "/api/v1/notification-preferences",
            json={"quiet_start": "25:99"},
            headers=AUTH_HEADERS,
        )
    assert r.status_code == 422
