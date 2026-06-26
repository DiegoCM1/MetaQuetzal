"""Tools the AI agent can call during a chat turn.

Step 1 keeps this deliberately simple: plain functions plus a tiny registry the
agent loop can iterate over. When a second real tool lands (web search), promote
this to a `tools/` package with a proper `Tool` abstraction — not before.

A "tool" here is three things bound together:
  - a name (how the model refers to it)
  - a JSON schema (what the model reads to decide when/how to call it)
  - a handler (the async Python function that actually runs)
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_TZ = "America/Mexico_City"

# Spanish names so the model gets text it can echo directly to the user.
_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


async def get_datetime(timezone: str = DEFAULT_TZ) -> str:
    """Return the current date and time as a human-readable Spanish string.

    Falls back to the default timezone, then to UTC, instead of raising — a tool
    must never crash the agent loop. The model can recover from a degraded answer;
    it cannot recover from an exception.
    """
    try:
        tz = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError, KeyError):
        logger.warning("[tool:get_datetime] unknown timezone %r, falling back to %s", timezone, DEFAULT_TZ)
        try:
            tz = ZoneInfo(DEFAULT_TZ)
        except ZoneInfoNotFoundError:
            logger.error("[tool:get_datetime] tzdata missing, falling back to UTC")
            tz = ZoneInfo("UTC") if _utc_available() else None

    now = datetime.now(tz) if tz else datetime.utcnow()
    dia = _DIAS[now.weekday()]
    mes = _MESES[now.month - 1]
    readable = f"Son las {now.strftime('%H:%M')} del {dia} {now.day} de {mes} de {now.year}"
    return readable


def _utc_available() -> bool:
    try:
        ZoneInfo("UTC")
        return True
    except ZoneInfoNotFoundError:
        return False


# === web_search ============================================================
# Provider (Tavily) is fully contained here. Search APIs are NOT standardized,
# so switching providers means rewriting this function's body — but ONLY this
# body. The model's contract (web_search(query) -> str) and the returned string
# never expose Tavily's shape, so nothing downstream changes on a swap.

_TAVILY_URL = "https://api.tavily.com/search"


def _format_tavily(data: dict, query: str) -> str:
    """Collapse Tavily's JSON into a compact, model-friendly string.

    We lead with Tavily's synthesized `answer` (cheap context for a 120-word
    assistant) and append a few source snippets the model can cite.
    """
    lines: list[str] = []
    answer = (data.get("answer") or "").strip()
    if answer:
        lines.append(answer)

    for r in (data.get("results") or [])[:3]:
        title = (r.get("title") or "").strip()
        # Tavily uses `content`/`url`; tolerate `snippet`/`link` defensively.
        content = (r.get("content") or r.get("snippet") or "").strip()
        url = r.get("url") or r.get("link") or ""
        if content:
            lines.append(f"- {title}: {content[:200]} ({url})")

    if not lines:
        return f"No encontré resultados para: {query}."
    return "\n".join(lines)


async def web_search(query: str) -> str:
    """Search the web via Tavily; return a compact summary for the model.

    Degrades to a text message on any failure (missing key, network, HTTP) —
    a tool must never raise into the agent loop.
    """
    if not settings.TAVILY_API_KEY:
        logger.warning("[tool:web_search] TAVILY_API_KEY not set — tool disabled")
        return "La búsqueda web no está disponible en este momento."

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                _TAVILY_URL,
                headers={"Authorization": f"Bearer {settings.TAVILY_API_KEY}"},
                json={
                    "query": query,
                    "search_depth": settings.TAVILY_SEARCH_DEPTH,
                    "max_results": 5,
                    "include_answer": "basic",
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        logger.error("[tool:web_search] Tavily request failed: %s", exc, exc_info=True)
        return "No pude completar la búsqueda web en este momento."

    return _format_tavily(data, query)


GET_DATETIME_SCHEMA = {
    "type": "function",
    "function": {
        "name": "get_datetime",
        "description": (
            "Obtiene la fecha y hora actual. Úsalo cuando el usuario pregunte por "
            "la hora, la fecha, el día de hoy, o cuánto falta para un evento."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": (
                        "Zona horaria IANA. OPCIONAL: si se omite, se usa "
                        "automáticamente la zona horaria de la ubicación del usuario. "
                        "Especifícala solo si el usuario pregunta por OTRO lugar "
                        "(por ejemplo 'Asia/Tokyo')."
                    ),
                }
            },
            "required": [],
        },
    },
}


WEB_SEARCH_SCHEMA = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": (
            "Busca información actualizada en internet. Úsalo cuando necesites "
            "datos recientes o que no conoces con certeza: noticias, avisos "
            "oficiales, estado de carreteras o refugios, o cualquier dato en "
            "tiempo real. NO lo uses para conocimiento general que ya tienes."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "La consulta de búsqueda, específica y concisa, preferiblemente en español.",
                }
            },
            "required": ["query"],
        },
    },
}


# --- The registry the agent loop consumes ----------------------------------
# name -> handler. Static default map (used by tests / when there's no request
# context). The agent loop uses build_tool_handlers() to bind per-request state.
TOOL_HANDLERS = {
    "get_datetime": get_datetime,
    "web_search": web_search,
}

TOOL_SCHEMAS = [
    GET_DATETIME_SCHEMA,
    WEB_SEARCH_SCHEMA,
]


WEB_SEARCH_BUDGET = 2  # max Tavily calls per assistant turn (credit protection)


def build_tool_handlers(*, user_timezone: str | None = None, web_search_budget: int = WEB_SEARCH_BUDGET) -> dict:
    """Build request-scoped tool handlers with the current user's context baked in.

    Module-level TOOL_HANDLERS is created once at import — long before any
    request — so it can't know the user's timezone. Per request we capture the
    live context in a closure: when the model omits `timezone`, the tool falls
    back to the USER's real zone (resolved server-side from their coordinates),
    not a hardcoded default. The model can still pass an explicit timezone to
    override (e.g. the user asks about another city).

    The same closure also carries a per-turn web_search counter. Models tend to
    re-search greedily (3+ Tavily calls for one question = 3+ credits), so we cap
    it in CODE — a prompt nudge can only ask, this guarantees. Past the budget,
    the tool short-circuits (no Tavily call, no credit) and tells the model to
    answer with what it already has.
    """
    user_tz = user_timezone or DEFAULT_TZ
    state = {"web_searches": 0}

    async def _get_datetime(timezone: str | None = None) -> str:
        return await get_datetime(timezone or user_tz)

    async def _web_search(query: str) -> str:
        if state["web_searches"] >= web_search_budget:
            logger.info("[tool:web_search] budget %s reached, refusing extra search", web_search_budget)
            return (
                "Ya realizaste varias búsquedas. Responde ahora con la información "
                "que ya tienes; no busques más."
            )
        state["web_searches"] += 1
        return await web_search(query)

    return {
        "get_datetime": _get_datetime,
        "web_search": _web_search,
    }