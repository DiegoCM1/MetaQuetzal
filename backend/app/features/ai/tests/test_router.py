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


# ---------------------------------------------------------------------------
# POST /api/v1/ai/alert-summary
# ---------------------------------------------------------------------------

_AI = "app.features.ai.router"
_FAKE_ALERT_ID = "00000000-0000-0000-0000-000000000001"


def test_alert_summary_returns_summary():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
        with patch(f"{_AI}.alert_summary", new_callable=AsyncMock, return_value="Resumen de prueba.") as mock_svc:
            r = client.post(
                "/api/v1/ai/alert-summary",
                json={"alert_id": _FAKE_ALERT_ID},
                headers={"Authorization": "Bearer faketoken"},
            )
    assert r.status_code == 200
    body = r.json()
    assert body["summary"] == "Resumen de prueba."
    assert body["alert_id"] == _FAKE_ALERT_ID
    mock_svc.assert_called_once()


def test_alert_summary_404():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
        with patch(f"{_AI}.alert_summary", new_callable=AsyncMock, side_effect=ValueError("alert_not_found")):
            r = client.post(
                "/api/v1/ai/alert-summary",
                json={"alert_id": "00000000-0000-0000-0000-000000000099"},
                headers={"Authorization": "Bearer faketoken"},
            )
    assert r.status_code == 404


def test_alert_summary_503():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
        with patch(f"{_AI}.alert_summary", new_callable=AsyncMock, side_effect=RuntimeError("llm_unavailable")):
            r = client.post(
                "/api/v1/ai/alert-summary",
                json={"alert_id": _FAKE_ALERT_ID},
                headers={"Authorization": "Bearer faketoken"},
            )
    assert r.status_code == 503


def test_alert_summary_no_auth():
    r = client.post(
        "/api/v1/ai/alert-summary",
        json={"alert_id": _FAKE_ALERT_ID},
    )
    assert r.status_code == 422


