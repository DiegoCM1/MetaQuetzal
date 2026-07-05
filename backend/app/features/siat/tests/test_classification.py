import pytest

from app.features.siat.classification import classification_label, classify_wind_kmh


@pytest.mark.parametrize(
    "wind_kmh,expected",
    [
        (0, "TD"),
        (62, "TD"),
        (63, "TS"),
        (100, "TS"),
        (118, "TS"),
        (119, "HU"),
        (200, "HU"),
    ],
)
def test_classify_wind_kmh_thresholds(wind_kmh, expected):
    assert classify_wind_kmh(wind_kmh) == expected


@pytest.mark.parametrize(
    "code,expected",
    [
        ("HU", "Huracán"),
        ("TS", "Tormenta Tropical"),
        ("TD", "Depresión Tropical"),
    ],
)
def test_classification_label(code, expected):
    assert classification_label(code) == expected
