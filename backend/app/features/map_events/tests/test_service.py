import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.features.map_events.service import (
    MAP_EVENT_HIDE_DOWNVOTES,
    MAP_EVENT_VOTING_RADIUS_KM,
    decorate_map_event,
    distance_in_km,
    list_map_events,
    vote_map_event,
)


def test_distance_in_km_is_zero_for_same_point():
    assert distance_in_km(19.0, -96.0, 19.0, -96.0) == 0


def test_list_map_events_filters_by_radius_and_hidden_downvotes():
    db = AsyncMock()
    db.execute.return_value = MagicMock(
        fetchall=MagicMock(
            return_value=[
                ("event-near",),
                ("event-far",),
                ("event-hidden",),
            ]
        )
    )

    async def fake_get_event(_db, event_id, current_user_id):
        rows = {
            "event-near": {
                "id": "event-near",
                "user_id": 2,
                "type": "natural",
                "description": "Near",
                "lat": 19.0,
                "lon": -96.0,
                "upvotes": 0,
                "downvotes": 0,
            },
            "event-far": {
                "id": "event-far",
                "user_id": 2,
                "type": "natural",
                "description": "Far",
                "lat": 40.0,
                "lon": -96.0,
                "upvotes": 0,
                "downvotes": 0,
            },
            "event-hidden": {
                "id": "event-hidden",
                "user_id": 3,
                "type": "natural",
                "description": "Hidden",
                "lat": 19.0,
                "lon": -96.0,
                "upvotes": 0,
                "downvotes": MAP_EVENT_HIDE_DOWNVOTES,
            },
        }
        return rows[event_id]

    async def run_test():
        with patch("app.features.map_events.service.ensure_map_events_table", new_callable=AsyncMock):
            with patch("app.features.map_events.service.get_map_event_with_votes", new_callable=AsyncMock, side_effect=fake_get_event):
                return await list_map_events(db, lat=19.0, lon=-96.0, radius_km=10, current_user_id=10)

    result = asyncio.run(run_test())

    assert len(result) == 1
    assert result[0]["id"] == "event-near"
    assert result[0]["within_voting_radius"] is True
    assert result[0]["trust_status"] == "en_revision"


def test_decorate_map_event_builds_confirmed_state():
    event = {
        "id": "event-near",
        "user_id": 2,
        "type": "natural",
        "description": "Near",
        "lat": 19.0,
        "lon": -96.0,
        "upvotes": 3,
        "downvotes": 0,
        "user_vote": None,
    }

    decorated = decorate_map_event(event, 19.0, -96.0, current_user_id=7)

    assert decorated["trust_status"] == "confirmado"
    assert decorated["can_vote"] is True


def test_vote_map_event_rejects_owner_vote():
    db = AsyncMock()
    db.execute.return_value = MagicMock(fetchone=MagicMock(return_value=(7,)))

    async def run_test():
        with patch("app.features.map_events.service.ensure_map_events_table", new_callable=AsyncMock):
            with pytest.raises(HTTPException) as exc:
                await vote_map_event(
                    db,
                    event_id="2b809806-51ef-4aee-97f1-39039e2d40f0",
                    user_id=7,
                    value=1,
                    voter_lat=19.0,
                    voter_lon=-96.0,
                )
            return exc

    exc = asyncio.run(run_test())

    assert exc.value.status_code == 403
    assert "own event" in exc.value.detail


def test_vote_map_event_rejects_duplicate_vote():
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(fetchone=MagicMock(return_value=(8,))),
        MagicMock(fetchone=MagicMock(return_value=(19.0, -96.0))),
        MagicMock(fetchone=MagicMock(return_value=(1,))),
    ]

    async def run_test():
        with patch("app.features.map_events.service.ensure_map_events_table", new_callable=AsyncMock):
            with pytest.raises(HTTPException) as exc:
                await vote_map_event(
                    db,
                    event_id="2b809806-51ef-4aee-97f1-39039e2d40f0",
                    user_id=7,
                    value=1,
                    voter_lat=19.0,
                    voter_lon=-96.0,
                )
            return exc

    exc = asyncio.run(run_test())

    assert exc.value.status_code == 409
    assert "already voted" in exc.value.detail


def test_vote_map_event_rejects_voter_outside_10km():
    db = AsyncMock()
    db.execute.side_effect = [
        MagicMock(fetchone=MagicMock(return_value=(8,))),
        MagicMock(fetchone=MagicMock(return_value=(19.0, -96.0))),
    ]

    async def run_test():
        with patch("app.features.map_events.service.ensure_map_events_table", new_callable=AsyncMock):
            with pytest.raises(HTTPException) as exc:
                await vote_map_event(
                    db,
                    event_id="2b809806-51ef-4aee-97f1-39039e2d40f0",
                    user_id=7,
                    value=-1,
                    voter_lat=19.0 + (MAP_EVENT_VOTING_RADIUS_KM / 100),
                    voter_lon=-96.0,
                )
            return exc

    exc = asyncio.run(run_test())

    assert exc.value.status_code == 403
    assert "within 10 km" in exc.value.detail
