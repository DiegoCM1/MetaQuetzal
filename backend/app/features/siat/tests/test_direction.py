import pytest

from app.features.siat.direction import (
    angular_difference,
    bearing_deg,
    parse_movement_direction,
)


@pytest.mark.parametrize(
    "value,expected",
    [
        ("270", 270.0),
        ("0", 0.0),
        ("360", 0.0),
        ("45.5", 45.5),
        ("N", 0.0),
        ("nw", 315.0),
        ("ENE", 67.5),
        ("SSW", 202.5),
    ],
)
def test_parse_movement_direction_valid(value, expected):
    assert parse_movement_direction(value) == expected


@pytest.mark.parametrize("value", [None, "", "  ", "not-a-direction", "XYZ"])
def test_parse_movement_direction_invalid(value):
    assert parse_movement_direction(value) is None


def test_bearing_deg_due_north():
    # Point directly north → bearing 0.
    assert bearing_deg(19.0, -99.0, 20.0, -99.0) == pytest.approx(0.0, abs=1e-6)


def test_bearing_deg_due_east():
    # Near the equator, due east → bearing ~90.
    assert bearing_deg(0.0, 0.0, 0.0, 1.0) == pytest.approx(90.0, abs=1e-6)


def test_bearing_deg_due_south():
    assert bearing_deg(20.0, -99.0, 19.0, -99.0) == pytest.approx(180.0, abs=1e-6)


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (0, 0, 0),
        (0, 90, 90),
        (350, 10, 20),
        (10, 350, 20),
        (0, 180, 180),
        (170, 190, 20),
        (0, 359, 1),
    ],
)
def test_angular_difference(a, b, expected):
    assert angular_difference(a, b) == pytest.approx(expected, abs=1e-6)
