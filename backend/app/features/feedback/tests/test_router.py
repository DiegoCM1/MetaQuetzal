# Imports
from app.main import app
from app.core.database import get_db
from starlette.testclient import TestClient
import pytest
from unittest.mock import ANY, patch, AsyncMock, MagicMock


async def override_get_db():
    yield MagicMock()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Regular request
# 1. Mock db
# 2. Mock firebase
# 3. Mock upload_feedback

def test_feedback_was_uploaded():
    with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
        with patch("app.features.feedback.router.upload_feedback", new_callable=AsyncMock, return_value=123) as mock_upload_feedback:
            response = client.post(
                "/feedback",
                json={
                    "rating": 5,
                    "email": "yourmother@gmail.com",
                    "message": "Hey",
                },
                headers={
                    "Authorization": "Bearer faketoken"
                }
            )
    
    assert response.status_code == 201
    assert response.json()["id"] == 123
    mock_upload_feedback.assert_called_once_with(
        ANY, 5, "yourmother@gmail.com", "Hey"
    )






# Wrong Headers








# No headers