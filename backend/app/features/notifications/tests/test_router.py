import pytest
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app
from app.core.config import settings
from datetime import datetime, timezone

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}
TEST_API_KEY = "test-notif-api-key"
API_KEY_HEADERS = {"X-Api-Key": TEST_API_KEY}


@pytest.fixture(autouse=True)
def _patch_api_key():
    with patch.object(settings, "NOTIF_API_KEY", TEST_API_KEY):
        yield

FAKE_DB_USER = {
    "id": 1,
    "firebase_uid": "firebase-test-uid",
    "lat": None,
    "lon": None,
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


def test_push_token_saves_for_user():
    with _mock_auth():
        with patch("app.features.notifications.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=FAKE_DB_USER):
            with patch("app.features.notifications.router.push_token", new_callable=AsyncMock, return_value=None):
                r = client.post(
                    "/api/v1/push-token",
                    json={"token": "firebase-device-token-abc123"},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 201
    assert r.json()["message"] == "Token saved"


def test_push_token_requires_auth():
    r = client.post("/api/v1/push-token", json={"token": "some-token"})
    assert r.status_code == 422


def test_push_token_404_no_profile():
    with _mock_auth():
        with patch("app.features.notifications.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            r = client.post(
                "/api/v1/push-token",
                json={"token": "firebase-device-token-abc123"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 404


def test_send_all_requires_api_key():
    r = client.post("/api/v1/notifications/send-all", json={"title": "Test", "body": "msg", "data": {}})
    assert r.status_code == 422


# --- Tests: POST /api/v1/notifications/test ---

ADMIN_EMAIL = "admin@blueye.mx"
NON_ADMIN_EMAIL = "user@blueye.mx"


def _mock_auth_email(email: str):
    return patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test-uid", "email": email})


def test_test_notif_no_auth():
    """Missing Authorization header → 422 (FastAPI Header validation)."""
    r = client.post("/api/v1/notifications/test", json={"type": "generic"})
    assert r.status_code == 422


def test_test_notif_not_configured():
    """Empty allowlist → 403 even for a valid user."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ""):
        with _mock_auth_email(ADMIN_EMAIL):
            r = client.post(
                "/api/v1/notifications/test",
                json={"type": "generic"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 403
    assert "not configured" in r.json()["detail"].lower()


def test_test_notif_user_not_admin():
    """Authenticated user whose email is not in the allowlist → 403."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(NON_ADMIN_EMAIL):
            r = client.post(
                "/api/v1/notifications/test",
                json={"type": "generic"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 403
    assert "not authorized" in r.json()["detail"].lower()


def test_test_notif_admin_success():
    """Admin email in allowlist → 200 with success_count."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            with patch(
                "app.features.notifications.router.send_all_notifications",
                new_callable=AsyncMock,
                return_value={"success_count": 2, "failure_count": 0},
            ):
                r = client.post(
                    "/api/v1/notifications/test",
                    json={"type": "hurricane_l2"},
                    headers=AUTH_HEADERS,
                )
    assert r.status_code == 200
    assert r.json()["success_count"] == 2


def test_test_notif_invalid_type():
    """Enum validation: unknown type → 422."""
    with patch.object(settings, "NOTIFICATION_TEST_ADMIN_EMAILS", ADMIN_EMAIL):
        with _mock_auth_email(ADMIN_EMAIL):
            r = client.post(
                "/api/v1/notifications/test",
                json={"type": "hacked_payload"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 422
