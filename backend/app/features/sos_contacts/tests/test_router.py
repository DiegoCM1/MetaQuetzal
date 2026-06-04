from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from starlette.testclient import TestClient

from app.main import app

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

FAKE_CONTACT = {
    "id": 1,
    "user_id": 42,
    "name": "Mamá",
    "phone": "+5219991234567",
    "relationship": "Madre",
    "created_at": datetime.now(timezone.utc),
    "updated_at": datetime.now(timezone.utc),
}


def _mock_auth():
    return patch("app.core.auth.auth.verify_id_token", return_value=FAKE_USER)


def _mock_user(return_value=FAKE_DB_USER):
    return patch(
        "app.features.sos_contacts.router.get_user_by_firebase_uid",
        new_callable=AsyncMock,
        return_value=return_value,
    )


# ── GET ────────────────────────────────────────────────────────────────────────

def test_list_contacts_empty():
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.list_sos_contacts",
            new_callable=AsyncMock,
            return_value=[],
        ):
            r = client.get("/api/v1/sos-contacts", headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert r.json() == []


def test_list_contacts_returns_data():
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.list_sos_contacts",
            new_callable=AsyncMock,
            return_value=[FAKE_CONTACT],
        ):
            r = client.get("/api/v1/sos-contacts", headers=AUTH_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["name"] == "Mamá"
    assert data[0]["phone"] == "+5219991234567"
    assert data[0]["relationship"] == "Madre"


def test_list_contacts_requires_auth():
    r = client.get("/api/v1/sos-contacts")
    assert r.status_code == 422


def test_list_contacts_user_not_found():
    with _mock_auth(), _mock_user(return_value=None):
        r = client.get("/api/v1/sos-contacts", headers=AUTH_HEADERS)
    assert r.status_code == 404


# ── POST ───────────────────────────────────────────────────────────────────────

def test_create_contact_201():
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.create_sos_contact",
            new_callable=AsyncMock,
            return_value=FAKE_CONTACT,
        ):
            r = client.post(
                "/api/v1/sos-contacts",
                json={"name": "Mamá", "phone": "+5219991234567", "relationship": "Madre"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 201
    assert r.json()["name"] == "Mamá"
    assert r.json()["id"] == 1


def test_create_contact_without_relationship():
    contact_no_rel = {**FAKE_CONTACT, "relationship": None}
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.create_sos_contact",
            new_callable=AsyncMock,
            return_value=contact_no_rel,
        ):
            r = client.post(
                "/api/v1/sos-contacts",
                json={"name": "Papá", "phone": "+5219997654321"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 201
    assert r.json()["relationship"] is None


def test_create_contact_missing_name():
    with _mock_auth(), _mock_user():
        r = client.post(
            "/api/v1/sos-contacts",
            json={"phone": "+5219991234567"},
            headers=AUTH_HEADERS,
        )
    assert r.status_code == 422


def test_create_contact_missing_phone():
    with _mock_auth(), _mock_user():
        r = client.post(
            "/api/v1/sos-contacts",
            json={"name": "Mamá"},
            headers=AUTH_HEADERS,
        )
    assert r.status_code == 422


def test_create_contact_requires_auth():
    r = client.post("/api/v1/sos-contacts", json={"name": "X", "phone": "12345"})
    assert r.status_code == 422


def test_create_contact_user_not_found():
    with _mock_auth(), _mock_user(return_value=None):
        r = client.post(
            "/api/v1/sos-contacts",
            json={"name": "Mamá", "phone": "+5219991234567"},
            headers=AUTH_HEADERS,
        )
    assert r.status_code == 404


# ── PATCH ──────────────────────────────────────────────────────────────────────

def test_update_contact_200():
    updated = {**FAKE_CONTACT, "phone": "+5219990000000"}
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.update_sos_contact",
            new_callable=AsyncMock,
            return_value=updated,
        ):
            r = client.patch(
                "/api/v1/sos-contacts/1",
                json={"phone": "+5219990000000"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 200
    assert r.json()["phone"] == "+5219990000000"


def test_update_contact_404():
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.update_sos_contact",
            new_callable=AsyncMock,
            side_effect=HTTPException(status_code=404, detail="SOS contact not found"),
        ):
            r = client.patch(
                "/api/v1/sos-contacts/999",
                json={"phone": "+5219990000000"},
                headers=AUTH_HEADERS,
            )
    assert r.status_code == 404


def test_update_contact_requires_auth():
    r = client.patch("/api/v1/sos-contacts/1", json={"phone": "12345"})
    assert r.status_code == 422


def test_update_contact_user_not_found():
    with _mock_auth(), _mock_user(return_value=None):
        r = client.patch(
            "/api/v1/sos-contacts/1",
            json={"phone": "+5219990000000"},
            headers=AUTH_HEADERS,
        )
    assert r.status_code == 404


# ── DELETE ─────────────────────────────────────────────────────────────────────

def test_delete_contact_204():
    with _mock_auth(), _mock_user():
        with patch(
            "app.features.sos_contacts.router.delete_sos_contact",
            new_callable=AsyncMock,
        ):
            r = client.delete("/api/v1/sos-contacts/1", headers=AUTH_HEADERS)
    assert r.status_code == 204


def test_delete_contact_requires_auth():
    r = client.delete("/api/v1/sos-contacts/1")
    assert r.status_code == 422


def test_delete_contact_user_not_found():
    with _mock_auth(), _mock_user(return_value=None):
        r = client.delete("/api/v1/sos-contacts/1", headers=AUTH_HEADERS)
    assert r.status_code == 404
