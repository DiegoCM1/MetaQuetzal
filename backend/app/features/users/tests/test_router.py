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
    "display_name": None,
    "email": None,
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


# ---------------------------------------------------------------------------
# PUT /api/v1/users/me/profile
#
# El perfil del onboarding escribe DOS tablas (`users` + `notification_preferences`)
# y tiene que hacerlo en una sola transacción: el cliente marca el envío como exitoso
# y no vuelve a preguntar, así que un guardado a medias es indistinguible de uno
# completo. Por eso estas pruebas sustituyen la sesión de DB por una que cuenta
# commits y rollbacks — la atomicidad es el contrato, no un detalle.
# ---------------------------------------------------------------------------

import pytest
from app.core.database import get_db

FULL_PAYLOAD = {
    "first_name": "Diego",
    "last_name": "Colín",
    "phone": "+52 999 123 4567",
    "address_1": "Calle 60 #123",
    "address_2": "Depto 4",
    "zip_code": "97000",
    "state": "Yucatán",
    "age_range": "26-35",
    "nervousness_level": 7,
    "weather_info_level": 3,
}

SAVED_PROFILE = {
    **FAKE_PROFILE,
    "first_name": "Diego",
    "last_name": "Colín",
    "phone": "+52 999 123 4567",
    "nervousness_level": 7,
    "weather_info_level": 3,
}


class FakeSession:
    """Sesión mínima que solo lleva la cuenta de commits y rollbacks."""

    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


@pytest.fixture
def fake_db():
    session = FakeSession()

    async def _override():
        yield session

    app.dependency_overrides[get_db] = _override
    yield session
    app.dependency_overrides.pop(get_db, None)


def test_put_profile_saves_all_fields_in_one_commit(fake_db):
    update_mock = AsyncMock(return_value=SAVED_PROFILE)
    prefs_mock = AsyncMock(return_value={})
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            with patch("app.features.users.router.update_user_profile", update_mock):
                with patch("app.features.users.router.upsert_preferences", prefs_mock):
                    r = client.put("/api/v1/users/me/profile", json=FULL_PAYLOAD, headers=AUTH_HEADERS)

    assert r.status_code == 200
    assert r.json()["first_name"] == "Diego"

    # Los sliders van a preferencias; el resto a `users`. Ninguno cruza.
    user_fields = update_mock.await_args.args[2]
    assert "nervousness_level" not in user_fields
    assert user_fields["zip_code"] == "97000"
    assert prefs_mock.await_args.args[2] == {"nervousness_level": 7, "weather_info_level": 3}

    # Ninguna de las dos escrituras hace commit por su cuenta...
    assert update_mock.await_args.kwargs["commit"] is False
    assert prefs_mock.await_args.kwargs["commit"] is False
    # ...y el endpoint cierra exactamente una vez.
    assert fake_db.commits == 1
    assert fake_db.rollbacks == 0


def test_put_profile_partial_payload_does_not_null_absent_columns(fake_db):
    """Mandar solo un campo no debe borrar los demás.

    Esto es `exclude_unset=True`: sin él, Pydantic rellena las claves ausentes con None
    y el UPDATE las escribiría como NULL — un usuario que corrige su nombre perdería su
    domicilio.
    """
    update_mock = AsyncMock(return_value=SAVED_PROFILE)
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            with patch("app.features.users.router.update_user_profile", update_mock):
                r = client.put("/api/v1/users/me/profile", json={"first_name": "Diego"}, headers=AUTH_HEADERS)

    assert r.status_code == 200
    assert update_mock.await_args.args[2] == {"first_name": "Diego"}


def test_put_profile_rejects_overlong_field_with_422_not_500(fake_db):
    """31 caracteres de teléfono eran un 500 por truncamiento en Postgres."""
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            r = client.put("/api/v1/users/me/profile", json={"phone": "9" * 31}, headers=AUTH_HEADERS)
    assert r.status_code == 422


def test_put_profile_rejects_out_of_range_slider(fake_db):
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            r = client.put("/api/v1/users/me/profile", json={"nervousness_level": 11}, headers=AUTH_HEADERS)
    assert r.status_code == 422


def test_put_profile_404_when_user_row_missing(fake_db):
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=None):
            r = client.put("/api/v1/users/me/profile", json=FULL_PAYLOAD, headers=AUTH_HEADERS)
    assert r.status_code == 404
    assert fake_db.commits == 0


def test_put_profile_rolls_back_when_preferences_write_fails(fake_db):
    """Si falla la segunda escritura, la primera NO se queda guardada."""
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            with patch("app.features.users.router.update_user_profile", new_callable=AsyncMock, return_value=SAVED_PROFILE):
                with patch(
                    "app.features.users.router.upsert_preferences",
                    new_callable=AsyncMock,
                    side_effect=RuntimeError("db exploded"),
                ):
                    r = client.put("/api/v1/users/me/profile", json=FULL_PAYLOAD, headers=AUTH_HEADERS)

    assert r.status_code == 500
    assert fake_db.commits == 0
    assert fake_db.rollbacks == 1


def test_put_profile_empty_payload_is_a_noop(fake_db):
    with _mock_auth():
        with patch("app.features.users.router.get_user_by_firebase_uid", new_callable=AsyncMock, return_value=SAVED_PROFILE):
            r = client.put("/api/v1/users/me/profile", json={}, headers=AUTH_HEADERS)
    assert r.status_code == 200
    assert fake_db.commits == 0
