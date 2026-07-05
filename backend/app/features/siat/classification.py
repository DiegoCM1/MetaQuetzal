"""
Cyclone intensity classification — wind speed -> category code/label.

Deliberately separate from the SIAT level (evaluator.py): classification is
purely about storm intensity, while the SIAT level is about the risk a
specific user faces (proximity + heading). A weak depression can still
carry a high SIAT level if it's bearing down on someone at close range.
"""

_LABELS = {
    "HU": "Huracán",
    "TS": "Tormenta Tropical",
    "TD": "Depresión Tropical",
}


def classify_wind_kmh(wind_kmh: float) -> str:
    if wind_kmh >= 119:
        return "HU"
    if wind_kmh >= 63:
        return "TS"
    return "TD"


def classification_label(code: str) -> str:
    return _LABELS.get(code, code)
