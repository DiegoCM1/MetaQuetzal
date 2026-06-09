from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.features.future_integration.chat_rooms.router import router

app = FastAPI()
app.include_router(router)
app.dependency_overrides[get_db] = lambda: None

client = TestClient(app)


def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


@patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test-user"})
def test_list_rooms(mock_verify):
    with patch(
        "app.features.future_integration.chat_rooms.router.list_rooms",
        new_callable=AsyncMock,
        return_value=[{"id": 1, "name": "Zona Centro", "type": "group", "created_at": "2026-06-08T00:00:00Z"}],
    ) as mock_list_rooms:
        response = client.get("/api/v1/chat/rooms", headers=auth_headers())

    assert response.status_code == 200
    assert response.json()[0]["name"] == "Zona Centro"
    mock_verify.assert_called_once()
    mock_list_rooms.assert_called_once_with(mock_list_rooms.call_args.args[0], "test-user")


@patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test-user"})
def test_create_room(mock_verify):
    with patch(
        "app.features.future_integration.chat_rooms.router.create_room",
        new_callable=AsyncMock,
        return_value={"id": 5, "name": "Refugio Norte", "type": "group", "created_at": "2026-06-08T00:00:00Z"},
    ) as mock_create_room:
        response = client.post(
            "/api/v1/chat/rooms",
            headers=auth_headers(),
            json={"name": "Refugio Norte", "type": "group"},
        )

    assert response.status_code == 201
    assert response.json()["id"] == 5
    mock_verify.assert_called_once()
    mock_create_room.assert_called_once_with(mock_create_room.call_args.args[0], "Refugio Norte", "group", "test-user")
