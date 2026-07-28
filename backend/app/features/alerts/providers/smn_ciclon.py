"""
SMN (Servicio Meteorológico Nacional) cyclone advisory provider.

Scrapes the two per-basin "Aviso de Ciclón Tropical" pages. Unlike the general
forecast bulletin (see smn.py), these pages are a thin Joomla wrapper around an
embedded Laravel app (loaded via <iframe>) — the actual advisory content lives at:
  - Pacífico:  https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/WebAviso
  - Atlántico: https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public/WebAvisoAtlan

Both are server-rendered (no JS execution needed to scrape). When a basin has no
active system, the page renders a static "Aviso de No Ciclón" image with no data.
When active, a basin can have MULTIPLE simultaneous systems (e.g. two named storms
in the Pacific at once) — each is listed as a button with a `data-aviso-id`, and
only that id's own detail page (`{base}?searchText={id}`) has the full data.

Encoding/robustness notes mirror smn.py: the site has no versioned API, so parsing
is defensive — any missing field logs and falls back to None instead of raising.

Cached in-memory for 30 minutes, per basin. Returns stale cache on network error.
"""

import logging
import re
from datetime import timedelta, datetime, timezone

import httpx

logger = logging.getLogger(__name__)

_TOOLS_BASE = "https://smn.conagua.gob.mx/tools/GUI/PortalLaravel/public"
_OCEAN_URLS = {
    "atlantico": f"{_TOOLS_BASE}/WebAvisoAtlan",
    "pacifico": f"{_TOOLS_BASE}/WebAviso",
}
_CACHE_TTL = timedelta(minutes=30)
_cache: dict[str, dict] = {}


async def fetch_active_advisories(ocean: str) -> list[dict]:
    """
    Returns a list of active cyclone advisories for the given basin
    ("atlantico" | "pacifico"). Empty list when no system is active.
    Cached for 30 minutes. Returns stale cache on network error.
    """
    if ocean not in _OCEAN_URLS:
        raise ValueError(f"Unknown ocean: {ocean!r}")

    now = datetime.now(timezone.utc)
    cached = _cache.get(ocean)
    if cached and now - cached["fetched_at"] < _CACHE_TTL:
        return cached["data"]

    base_url = _OCEAN_URLS[ocean]
    try:
        async with httpx.AsyncClient(timeout=15.0, verify=False,
                                      headers={"User-Agent": "BluEye/1.0"}) as client:
            resp = await client.get(base_url, follow_redirects=True)
            resp.raise_for_status()
            html = resp.content.decode("utf-8", errors="replace")

            if "AVISO-DE-NO-CICLON" in html.upper():
                advisories: list[dict] = []
            else:
                aviso_ids = list(dict.fromkeys(re.findall(r'data-aviso-id="(\d+)"', html)))
                advisories = []
                for aviso_id in aviso_ids:
                    detail_resp = await client.get(f"{base_url}?searchText={aviso_id}", follow_redirects=True)
                    detail_resp.raise_for_status()
                    detail_html = detail_resp.content.decode("utf-8", errors="replace")
                    parsed = _parse_advisory(detail_html, ocean=ocean, aviso_id=aviso_id)
                    if parsed:
                        advisories.append(parsed)
    except Exception as exc:
        logger.warning("SMN cyclone advisory fetch failed (ocean=%s): %s", ocean, exc)
        return cached["data"] if cached else []

    _cache[ocean] = {"fetched_at": now, "data": advisories}
    logger.info("SMN cyclone advisories fetched (ocean=%s): %d active", ocean, len(advisories))
    return advisories


def _strip_tags(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def _extract_row(label: str, html: str) -> list[str] | None:
    """
    Finds a table row whose first <td> matches `label` and returns the text of
    the remaining <td> cells in that row (e.g. lat/lon or wind sostenidos/rachas
    are split across two cells).
    """
    pattern = rf"<td[^>]*>{re.escape(label)}</td>\s*(.*?)</tr>"
    m = re.search(pattern, html, re.DOTALL)
    if not m:
        return None
    cells = re.findall(r"<td[^>]*>(.*?)</td>", m.group(1), re.DOTALL)
    values = [_strip_tags(c) for c in cells]
    return values or None


def _first_number(text: str | None) -> float | None:
    if not text:
        return None
    m = re.search(r"[\d.]+", text)
    return float(m.group()) if m else None


def _parse_advisory(html: str, ocean: str, aviso_id: str) -> dict | None:
    aviso_num_match = re.search(r"No\.\s*Aviso:\s*(\d+)", html)
    aviso_num = int(aviso_num_match.group(1)) if aviso_num_match else None

    system_name_match = re.search(r"Sistema ciclónico:\s*([^<]+?)\s*</p>", html)
    system_name = system_name_match.group(1).strip() if system_name_match else None

    synthesis_match = re.search(r"<h3[^>]*>S[ií]ntesis</h3>\s*<p[^>]*>(.*?)</p>", html, re.DOTALL)
    synthesis = _strip_tags(synthesis_match.group(1)) if synthesis_match else None

    if not system_name and not synthesis:
        logger.warning(
            "SMN cyclone advisory parse failed (ocean=%s, aviso_id=%s): neither "
            "system name nor synthesis found — page structure may have changed",
            ocean, aviso_id,
        )
        return None

    issued_match = re.search(r"Emisión:\s*([\d-]+\s+\d{1,2}:\d{2})\s*horas", html)
    issued_at = issued_match.group(1) if issued_match else None

    ubicacion = _extract_row("Ubicación del centro", html)
    lat = _first_number(ubicacion[0]) if ubicacion and len(ubicacion) > 0 else None
    lon_raw = _first_number(ubicacion[1]) if ubicacion and len(ubicacion) > 1 else None
    # Site always reports "Longitud Oeste" for basins SMN tracks (Atlántico/Pacífico
    # oriental) — west of the prime meridian, so negate to standard signed convention.
    lon = -lon_raw if lon_raw is not None else None

    location_row = _extract_row("Distancia al lugar más cercano", html)
    location_text = location_row[0] if location_row else None

    movement_row = _extract_row("Desplazamiento actual", html)
    movement_text = movement_row[0] if movement_row else None

    wind_row = _extract_row("Vientos máximos [km/h]", html)
    wind_sustained_kmh = _first_number(wind_row[0]) if wind_row and len(wind_row) > 0 else None
    wind_gusts_kmh = _first_number(wind_row[1]) if wind_row and len(wind_row) > 1 else None

    pressure_row = _extract_row("Presión mínima central [hpa]", html)
    pressure_hpa = _first_number(pressure_row[0]) if pressure_row else None

    rain_row = _extract_row("Pronóstico de lluvia", html)
    rain_forecast = rain_row[0] if rain_row else None

    recommendations_row = _extract_row("Recomendaciones", html)
    recommendations = recommendations_row[0] if recommendations_row else None

    return {
        "ocean": ocean,
        "aviso_id": aviso_id,
        "aviso_num": aviso_num,
        "system_name": system_name,
        "issued_at": issued_at,
        "synthesis": synthesis,
        "location_text": location_text,
        "lat": lat,
        "lon": lon,
        "movement_text": movement_text,
        "wind_sustained_kmh": wind_sustained_kmh,
        "wind_gusts_kmh": wind_gusts_kmh,
        "pressure_hpa": pressure_hpa,
        "rain_forecast": rain_forecast,
        "recommendations": recommendations,
        "pdf_url": f"{_TOOLS_BASE}/generatePDF/{aviso_id}",
        "source": "SMN/CONAGUA",
    }
