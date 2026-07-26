import pytest
from unittest.mock import AsyncMock, MagicMock

from app.features.alerts.providers.smn_ciclon import _parse_advisory
from app.features.alerts.service import get_smn_cyclone_advisories, persist_smn_cyclone_advisory_if_new

# Trimmed but structurally faithful copy of the real WebAviso(Atlan) detail page
# (fetched 2026-07-25) — keeps only the tags the parser's regexes target.
_ACTIVE_ADVISORY_HTML = """
<html><body>
<header>
  <p class="mb-0 small">
    Océano Pacífico
    - No. Aviso: 5
  </p>
  <p class="mb-0 small">Emisión: 2026-07-25 09:00 horas (15:00 horas GMT)</p>
</header>
<div class="alert-banner">
  <p class="mb-0">Sistema ciclónico: Tormenta Tropical Genevieve</p>
</div>
<div class="sintesis-box">
  <h3 class="h5">Síntesis</h3>
  <p class="lead mb-0">TORMENTA TROPICAL GENEVIEVE AL SUR DEL TERRITORIO NACIONAL.</p>
</div>
<table>
  <tbody>
    <tr><td>Ubicación del centro</td><td>Latitud Norte: 10.8</td><td>Longitud Oeste: 104.3</td></tr>
    <tr><td>Distancia al lugar más cercano</td><td colspan="2">820 km al sur-suroeste de Zihuatanejo, Gro.</td></tr>
    <tr><td>Desplazamiento actual</td><td colspan="2">Hacia el oeste-noroeste (300°) a 24 km/h</td></tr>
    <tr><td>Vientos máximos [km/h]</td><td>Sostenidos: 95</td><td>Rachas: 110</td></tr>
    <tr><td>Presión mínima central [hpa]</td><td colspan="2">997</td></tr>
    <tr><td>Pronóstico de lluvia</td><td colspan="2">Lluvias fuertes en el occidente del país.</td></tr>
    <tr><td>Recomendaciones</td><td colspan="2">Debido a su distancia y trayectoria no se emiten recomendaciones.</td></tr>
  </tbody>
</table>
</body></html>
"""

_NO_CICLON_HTML = """
<html><body>
<div class="aviso-container">
    <img class="aviso-img" src="https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/./Img/AVISO-DE-NO-CICLON.jpg">
</div>
</body></html>
"""


# ---------------------------------------------------------------------------
# _parse_advisory
# ---------------------------------------------------------------------------

def test_parse_advisory_extracts_all_fields():
    result = _parse_advisory(_ACTIVE_ADVISORY_HTML, ocean="pacifico", aviso_id="10635")

    assert result is not None
    assert result["aviso_num"] == 5
    assert result["system_name"] == "Tormenta Tropical Genevieve"
    assert result["synthesis"] == "TORMENTA TROPICAL GENEVIEVE AL SUR DEL TERRITORIO NACIONAL."
    assert result["lat"] == 10.8
    assert result["lon"] == -104.3  # "Longitud Oeste" negated to standard convention
    assert result["location_text"] == "820 km al sur-suroeste de Zihuatanejo, Gro."
    assert result["movement_text"] == "Hacia el oeste-noroeste (300°) a 24 km/h"
    assert result["wind_sustained_kmh"] == 95
    assert result["wind_gusts_kmh"] == 110
    assert result["pressure_hpa"] == 997
    assert result["recommendations"] == "Debido a su distancia y trayectoria no se emiten recomendaciones."
    assert result["pdf_url"] == (
        "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/generatePDF/10635"
    )


def test_parse_advisory_returns_none_when_structure_unrecognized():
    result = _parse_advisory("<html><body>unexpected content</body></html>", ocean="pacifico", aviso_id="1")
    assert result is None


def test_parse_advisory_missing_optional_row_does_not_crash():
    html_without_pressure = _ACTIVE_ADVISORY_HTML.replace(
        '<tr><td>Presión mínima central [hpa]</td><td colspan="2">997</td></tr>', ""
    )
    result = _parse_advisory(html_without_pressure, ocean="pacifico", aviso_id="10635")
    assert result is not None
    assert result["pressure_hpa"] is None


# ---------------------------------------------------------------------------
# persist_smn_cyclone_advisory_if_new — service-level tests (no HTTP)
# ---------------------------------------------------------------------------

def _make_advisory(**overrides):
    base = {
        "ocean": "pacifico",
        "aviso_id": "10635",
        "aviso_num": 5,
        "system_name": "Tormenta Tropical Genevieve",
        "synthesis": "TORMENTA TROPICAL GENEVIEVE AL SUR DEL TERRITORIO NACIONAL.",
        "location_text": "820 km al sur-suroeste de Zihuatanejo, Gro.",
        "lat": 10.8,
        "lon": -104.3,
        "movement_text": "Hacia el oeste-noroeste (300°) a 24 km/h",
        "wind_sustained_kmh": 95,
        "wind_gusts_kmh": 110,
        "pressure_hpa": 997,
        "recommendations": "No se emiten recomendaciones.",
        "pdf_url": "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/generatePDF/10635",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_persist_new_cyclone_advisory_returns_true():
    db = MagicMock()
    db.commit = AsyncMock()
    db.execute = AsyncMock(side_effect=[
        MagicMock(**{"mappings.return_value.first.return_value": None}),  # dedup miss
        MagicMock(),  # INSERT
    ])

    result = await persist_smn_cyclone_advisory_if_new(db, _make_advisory())

    assert result is True
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_persist_existing_cyclone_advisory_returns_false():
    """Already-persisted advisory with no pdf_url to backfill → no write at all."""
    db = MagicMock()
    db.commit = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(
        **{"mappings.return_value.first.return_value": {"id": "existing-uuid"}}
    ))

    result = await persist_smn_cyclone_advisory_if_new(db, _make_advisory(pdf_url=None))

    assert result is False
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_persist_existing_cyclone_advisory_backfills_pdf_url():
    """Already-persisted advisory whose row is missing pdf_url gets it backfilled."""
    db = MagicMock()
    db.commit = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(
        **{"mappings.return_value.first.return_value": {"id": "existing-uuid"}}
    ))

    result = await persist_smn_cyclone_advisory_if_new(db, _make_advisory())

    assert result is False
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_persist_cyclone_advisory_title_includes_ocean_and_system():
    db = MagicMock()
    db.commit = AsyncMock()
    captured = {}

    async def _execute(stmt, params=None):
        if params and "title" in params and "id" not in params:
            captured["title"] = params["title"]
        return MagicMock(**{"mappings.return_value.first.return_value": None})

    db.execute = AsyncMock(side_effect=_execute)

    await persist_smn_cyclone_advisory_if_new(db, _make_advisory(ocean="atlantico", system_name="Huracán Fausto"))

    assert captured["title"] == "SMN Ciclón Atlántico: Huracán Fausto — Aviso #5"


@pytest.mark.asyncio
async def test_persist_cyclone_advisory_level_from_synthesis_keywords():
    """Reuses _smn_headline_to_level — a hurricane synthesis maps to a higher level."""
    db = MagicMock()
    db.commit = AsyncMock()
    captured = {}

    async def _execute(stmt, params=None):
        if params and "level" in params:
            captured["level"] = params["level"]
        return MagicMock(**{"mappings.return_value.first.return_value": None})

    db.execute = AsyncMock(side_effect=_execute)

    await persist_smn_cyclone_advisory_if_new(
        db, _make_advisory(synthesis="HURACÁN FAUSTO CATEGORÍA 4 EN EL PACÍFICO.")
    )

    assert captured["level"] == 5  # "CATEGORÍA 4" keyword


# ---------------------------------------------------------------------------
# get_smn_cyclone_advisories — maps DB rows (incl. cyclone_meta JSON) to dicts
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_smn_cyclone_advisories_maps_row_fields():
    fake_row = {
        "id": "uuid-1",
        "timestamp": "2026-07-25T15:00:00+00:00",
        "level": 3,
        "title": "SMN Ciclón Pacífico: Tormenta Tropical Genevieve — Aviso #5",
        "short": "TORMENTA TROPICAL GENEVIEVE AL SUR DEL TERRITORIO NACIONAL.",
        "lat": 10.8,
        "lon": -104.3,
        "pdf_url": "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/generatePDF/10635",
        "recommendations": ["No se emiten recomendaciones."],
        "cyclone_meta": {
            "ocean": "pacifico",
            "system_name": "Tormenta Tropical Genevieve",
            "aviso_num": 5,
            "location_text": "820 km al sur-suroeste de Zihuatanejo, Gro.",
            "movement_text": "Hacia el oeste-noroeste (300°) a 24 km/h",
            "wind_sustained_kmh": 95,
            "wind_gusts_kmh": 110,
            "pressure_hpa": 997,
        },
    }
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(**{"mappings.return_value.all.return_value": [fake_row]}))

    result = await get_smn_cyclone_advisories(db)

    assert len(result) == 1
    advisory = result[0]
    assert advisory["ocean"] == "pacifico"
    assert advisory["system_name"] == "Tormenta Tropical Genevieve"
    assert advisory["aviso_num"] == 5
    assert advisory["level"] == 3
    assert advisory["synthesis"] == fake_row["short"]
    assert advisory["wind_sustained_kmh"] == 95
    assert advisory["recommendations"] == "No se emiten recomendaciones."
    assert advisory["pdf_url"] == fake_row["pdf_url"]


@pytest.mark.asyncio
async def test_get_smn_cyclone_advisories_empty_when_none_active():
    db = MagicMock()
    db.execute = AsyncMock(return_value=MagicMock(**{"mappings.return_value.all.return_value": []}))

    result = await get_smn_cyclone_advisories(db)

    assert result == []
