from unittest.mock import ANY, AsyncMock, MagicMock, patch

from starlette.testclient import TestClient

from app.core.database import get_db
from app.main import app


async def override_get_db():
    yield MagicMock()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_get_map_events_returns_rows():
    fake_rows = [
        {
            "id": "2b809806-51ef-4aee-97f1-39039e2d40f0",
            "user_id": 1,
            "type": "natural",
            "description": "Árbol caído",
            "lat": 19.2,
            "lon": -96.1,
            "created_at": "2026-06-04T12:00:00Z",
            "updated_at": "2026-06-04T12:00:00Z",
            "upvotes": 1,
            "downvotes": 0,
            "user_vote": None,
            "is_owner": False,
            "distance_km": 2.5,
            "within_voting_radius": True,
            "can_vote": True,
            "trust_status": "en_revision",
        }
    ]

    with patch("app.features.map_events.router.DEV_BYPASS_MAP_EVENTS_AUTH", False):
        with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
            with patch("app.features.map_events.router.resolve_map_events_user", new_callable=AsyncMock, return_value=7):
                with patch("app.features.map_events.router.list_map_events", new_callable=AsyncMock, return_value=fake_rows) as mock_list:
                    response = client.get(
                        "/api/v1/map-events?lat=19.2&lon=-96.1&radius_km=10",
                        headers={"Authorization": "Bearer faketoken"},
                    )

    assert response.status_code == 200
    assert response.json()[0]["description"] == "Árbol caído"
    mock_list.assert_called_once_with(ANY, lat=19.2, lon=-96.1, radius_km=10.0, current_user_id=7)


def test_post_map_event_creates_event():
    fake_event = {
        "id": "2b809806-51ef-4aee-97f1-39039e2d40f0",
        "user_id": 1,
        "type": "natural",
        "description": "Árbol caído",
        "lat": 19.2,
        "lon": -96.1,
        "created_at": "2026-06-04T12:00:00Z",
        "updated_at": "2026-06-04T12:00:00Z",
        "upvotes": 0,
        "downvotes": 0,
        "user_vote": None,
        "is_owner": True,
        "distance_km": 0.0,
        "within_voting_radius": True,
        "can_vote": False,
        "trust_status": "en_revision",
    }

    with patch("app.features.map_events.router.DEV_BYPASS_MAP_EVENTS_AUTH", False):
        with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
            with patch("app.features.map_events.router.resolve_map_events_user", new_callable=AsyncMock, return_value=1):
                with patch("app.features.map_events.router.create_map_event", new_callable=AsyncMock, return_value=fake_event) as mock_create:
                    response = client.post(
                        "/api/v1/map-events",
                        json={
                            "type": "natural",
                            "description": "Árbol caído",
                            "lat": 19.2,
                            "lon": -96.1,
                        },
                        headers={"Authorization": "Bearer faketoken"},
                    )

    assert response.status_code == 201
    assert response.json()["is_owner"] is True
    mock_create.assert_called_once()


def test_vote_map_event_returns_updated_event():
    fake_event = {
        "id": "2b809806-51ef-4aee-97f1-39039e2d40f0",
        "user_id": 1,
        "type": "natural",
        "description": "Arbol caido",
        "lat": 19.2,
        "lon": -96.1,
        "created_at": "2026-06-04T12:00:00Z",
        "updated_at": "2026-06-04T12:00:00Z",
        "upvotes": 1,
        "downvotes": 0,
        "user_vote": 1,
        "is_owner": False,
        "distance_km": 1.2,
        "within_voting_radius": True,
        "can_vote": False,
        "trust_status": "en_revision",
    }

    with patch("app.features.map_events.router.DEV_BYPASS_MAP_EVENTS_AUTH", False):
        with patch("app.core.auth.auth.verify_id_token", return_value={"uid": "test123"}):
            with patch("app.features.map_events.router.resolve_map_events_user", new_callable=AsyncMock, return_value=9):
                with patch("app.features.map_events.router.vote_map_event", new_callable=AsyncMock, return_value=fake_event) as mock_vote:
                    response = client.post(
                        "/api/v1/map-events/2b809806-51ef-4aee-97f1-39039e2d40f0/vote",
                        json={"value": 1, "lat": 19.2, "lon": -96.1},
                        headers={"Authorization": "Bearer faketoken"},
                    )

    assert response.status_code == 200
    assert response.json()["user_vote"] == 1
    mock_vote.assert_called_once()
