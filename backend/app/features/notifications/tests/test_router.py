from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app
from datetime import datetime, timezone

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}
API_KEY_HEADERS = {"X-Api-Key": "s3cret-xyz"}

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
