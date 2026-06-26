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


# --- The registry the agent loop consumes ----------------------------------
# name -> handler. Static default map (used by tests / when there's no request
# context). The agent loop uses build_tool_handlers() to bind per-request state.
TOOL_HANDLERS = {
    "get_datetime": get_datetime,
}

TOOL_SCHEMAS = [
    GET_DATETIME_SCHEMA,
]


def build_tool_handlers(*, user_timezone: str | None = None) -> dict:
    """Build request-scoped tool handlers with the current user's context baked in.

    Module-level TOOL_HANDLERS is created once at import — long before any
    request — so it can't know the user's timezone. Per request we capture the
    live context in a closure: when the model omits `timezone`, the tool falls
    back to the USER's real zone (resolved server-side from their coordinates),
    not a hardcoded default. The model can still pass an explicit timezone to
    override (e.g. the user asks about another city).
    """
    user_tz = user_timezone or DEFAULT_TZ

    async def _get_datetime(timezone: str | None = None) -> str:
        return await get_datetime(timezone or user_tz)

    return {
        "get_datetime": _get_datetime,
    }