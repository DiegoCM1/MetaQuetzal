from app.main import app
from starlette.testclient import TestClient
import pytest
from unittest.mock import patch

client = TestClient(app)

def test_chat_returns_reply():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
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