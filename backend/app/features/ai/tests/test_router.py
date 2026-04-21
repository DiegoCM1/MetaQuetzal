from app.main import app
from starlette.testclient import TestClient
import pytest
from unittest.mock import patch, AsyncMock
from app.features.ai.schemas import Message

client = TestClient(app)

def test_chat_returns_reply():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
        with patch("app.features.ai.router.chat",  new_callable=AsyncMock, return_value="Test response") as mock_chat:
            response = client.post(
                "/ai/chat",
                json={
                    "messages": [
                        {"role": "user", "content": "hola"},
                        {"role": "bot", "content": "Wassup"}
                    ],
                    "location": "Tuxpan",
                    "latitude": 5,
                    "longitude": 10,
                },
                headers={"Authorization": "Bearer faketoken"}
            )
    assert response.status_code == 200
    assert response.json()["reply"] == "Test response"
    assert mock_chat.called
    mock_chat.assert_called_once_with(
        [Message(role="user", content="hola"), Message(role="bot", content="Wassup")],
        "Tuxpan",
        5,
        10
    )



def test_chat_invalid_token():
    response = client.post(
        "/ai/chat",
        json={

            "messages": [
                {"role": "user", "content": "hola"},
                {"role": "bot", "content": "Wassup"}
            ],    
            "location": "Tuxpan",
            "latitude": 5,
            "longitude": 10,
        },
        headers={"Authorization": "Bearer faketoken"}
    )
    assert response.status_code == 401



def test_chat_no_auth():
    response = client.post(
        "/ai/chat",
        json={

            "messages": [
                {"role": "user", "content": "hola"},
                {"role": "bot", "content": "Wassup"}
            ],    
            "location": "Tuxpan",
            "latitude": 5,
            "longitude": 10,
        },
    )
    assert response.status_code == 422


