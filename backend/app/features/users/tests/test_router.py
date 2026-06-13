from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient
from app.main import app
from datetime import datetime, timezone

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}

FAKE_PROFILE = {
    "id": 1,
    "firebase_uid": "firebase-test-uid",
    "phone": None,
    "lat": None,
    "lon": None,
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


def test_post_users_me_creates_profile():
    with _mock_auth():
        with patch("app.features.users.router.upsert_user", new_callable=AsyncMock, return_value=FAKE_PROFILE):
            r = client.post("/api/v1/users/me", headers=AUTH_HEADERS)
    assert r.status_code == 201
    assert r.json()["firebase_uid"] == "firebase-test-uid"


def test_get_users_me_returns_profile():
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=FAKE_PROFILE):
            r = client.get("/api/v1/users/me", headers=AUTH_HEADERS)
    assert r.status_code == 200


def test_get_users_me_404_when_no_profile():
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            r = client.get("/api/v1/users/me", headers=AUTH_HEADERS)
    assert r.status_code == 404


def test_patch_location_updates_coords():
    updated = {**FAKE_PROFILE, "lat": 19.4326, "lon": -99.1332}
    with _mock_auth():
        with patch("app.features.users.router.update_user_location", new_callable=AsyncMock, return_value=updated):
            r = client.patch(
                "/api/v1/users/me/location",
                json={"lat": 19.4326, "lon": -99.1332},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 200
    assert r.json()["lat"] == 19.4326
