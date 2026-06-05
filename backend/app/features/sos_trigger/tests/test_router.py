from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from starlette.testclient import TestClient

from app.main import app

client = TestClient(app)

FAKE_USER = {"uid": "firebase-test-uid", "name": "Boro"}
AUTH_HEADERS = {"Authorization": "Bearer faketoken"}
FAKE_DB_USER = {"id": 42, "firebase_uid": "firebase-test-uid", "lat": None, "lon": None,
                "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}

TRIGGER_OK     = {"notified_count": 2, "skipped_count": 0, "sos_event_id": 1}
TRIGGER_ZERO   = {"notified_count": 0, "skipped_count": 0, "sos_event_id": 2}
TRIGGER_SKIP   = {"notified_count": 0, "skipped_count": 1, "sos_event_id": 3}


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


def _mock_user(rv=FAKE_DB_USER):
    return patch("app.features.sos_trigger.router.get_user_by_firebase_uid",
                 new_callable=AsyncMock, return_value=rv)


def _mock_svc(rv=None, exc=None):
    return patch("app.features.sos_trigger.router.trigger_sos",
                 new_callable=AsyncMock, return_value=rv, side_effect=exc)


def test_trigger_200_with_tokens():
    with _mock_auth(), _mock_user(), _mock_svc(rv=TRIGGER_OK):
        r = client.post("/api/v1/sos/trigger",
                        json={"lat": 20.97, "lon": -89.62},
                        headers=AUTH_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["notified_count"] == 2
    assert body["skipped_count"] == 0
    assert body["sos_event_id"] == 1


def test_trigger_200_no_linked_contacts():
    with _mock_auth(), _mock_user(), _mock_svc(rv=TRIGGER_ZERO):
        r = client.post("/api/v1/sos/trigger", json={}, headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["notified_count"] == 0
    assert r.json()["sos_event_id"] == 2


def test_trigger_200_contacts_no_tokens():
    with _mock_auth(), _mock_user(), _mock_svc(rv=TRIGGER_SKIP):
        r = client.post("/api/v1/sos/trigger", json={}, headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json()["skipped_count"] == 1
    assert r.json()["notified_count"] == 0


def test_trigger_429_rate_limited():
    exc = HTTPException(429, "Demasiadas alertas SOS.",
                        headers={"Retry-After": "600"})
    with _mock_auth(), _mock_user(), _mock_svc(exc=exc):
        r = client.post("/api/v1/sos/trigger", json={}, headers=AUTH_HEADERS)
    assert r.status_code == 429


def test_trigger_requires_auth():
    assert client.post("/api/v1/sos/trigger", json={}).status_code == 422


def test_trigger_user_not_found():
    with _mock_auth(), _mock_user(rv=None):
        r = client.post("/api/v1/sos/trigger", json={}, headers=AUTH_HEADERS)
    assert r.status_code == 404
