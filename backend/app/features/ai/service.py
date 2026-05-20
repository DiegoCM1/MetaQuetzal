import httpx
import json
import logging
from app.core.config import settings
from app.features.ai.rag import retrieve
from app.features.alerts.service import get_alert_by_id

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Bluai, an AI assistant specialized in hurricane preparedness, response, and recovery for residents of Mexico.

  ROLE: You help users before, during, and after hurricanes. Adapt your tone to the
  situation — calm and educational for preparation, clear and direct during active storms,
  and supportive during recovery.

  FORMAT: Maximum 120 words. Short sentences. Bullet points for action steps.

  RULES:
  1. Always respond in simple Spanish. No English.
  2. Prioritize life safety above all else.
  3. Give practical, actionable advice specific to the user's situation.
  4. For preparation: focus on supplies, evacuation plans, home reinforcement, and official
   alert systems (CONAGUA, Protección Civil).
  5. For active storms: focus on immediate safety — shelter, avoiding flooded roads,
  staying informed via radio.
  6. For recovery: focus on safety hazards (downed lines, contaminated water),
  documentation for insurance, and mental health.
  7. Never provide real-time weather data — tell users to check CONAGUA or local
  authorities."""


async def fetch_weather(latitude: float, longitude: float) -> str:                                 
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url="https://api.openweathermap.org/data/3.0/onecall",
            params={                                                                               
                "lat": latitude,
                "lon": longitude,                                                                  
                "exclude": "minutely,hourly,daily",
                "appid": settings.OPENWEATHER_API_KEY,                                             
                "units": "metric",
                "lang": "es",                                                                      
            }   
        )                                                                                          
        data = response.json()
        current = data["current"]                                                                  
        desc = current["weather"][0]["description"]
        temp = current["temp"]
        wind = current["wind_speed"]
        weather_str = f"Clima: {temp}°C, {desc}, viento {wind} m/s."                               
        if "alerts" in data:                                                                       
            for alert in data["alerts"]:                                                           
                weather_str += f" ⚠️  Alerta: {alert['event']} — {alert['description'][:100]}"      
        return weather_str  


async def chat(messages: list[dict], location: str | None = None, latitude: float | None = None, longitude: float | None = None):
    system_content = SYSTEM_PROMPT

    print(f"[chat] Query from user: {messages[-1].content}")

    if location:
        system_content += f"\n\nUbicación actual del usuario: {location}."
    print(f"[chat:location] {location}")

    if latitude and longitude:
        try:
            weather = await fetch_weather(latitude, longitude)
            system_content += f"\n\n{weather}"
            print(f"[chat:weather] {weather}")
        except Exception as e:
            print(f"[chat:weather] weather fetch failed: {e}")

    try:
        retrieved_chunks_list = retrieve(messages[-1].content)
        normalized_chunks = "\n\n".join(retrieved_chunks_list)
        message_for_ai = f"This is some additional context: {normalized_chunks}"

        if retrieved_chunks_list:
            system_content += f"\n\n{message_for_ai}"
            print(f"[chat:rag] RAG chunks injected: {len(retrieved_chunks_list)}")
        else:
            print(f"[chat:rag] no relevant chunks found")
    except Exception as e:
        print(f"[chat:rag] RAG failed: {e}")

    print(f"[chat] system prompt tail: ...{system_content[-100:]}")
    print(f"[chat] messages count: {len(messages)}")
    full_messages = [{"role": "system", "content": system_content}] + [m.model_dump() for m in messages]

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.LLM_MODEL,
                    "messages": full_messages,
                    "stream": True,
                },
            ) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    logger.error(
                        "[chat:llm] upstream returned %s: %r",
                        response.status_code,
                        error_body,
                    )
                    raise RuntimeError(f"LLM upstream returned {response.status_code}")

                try:
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            yield f"{line}\n\n"
                            if line.strip() == "data: [DONE]":
                                return
                except httpx.HTTPError as exc:
                    logger.error(
                        "[chat:llm] stream interrupted mid-flight: %s",
                        exc,
                        exc_info=True,
                    )
                    yield 'data: {"error": "stream_interrupted"}\n\n'
                    yield "data: [DONE]\n\n"
                    return
    except httpx.ConnectError as exc:
        logger.error("[chat:llm] cannot connect to LLM: %s", exc, exc_info=True)
        raise RuntimeError("LLM connection failed") from exc
    except httpx.TimeoutException as exc:
        logger.error("[chat:llm] LLM request timed out: %s", exc, exc_info=True)
        raise RuntimeError("LLM timeout") from exc
    except httpx.HTTPError as exc:
        logger.error("[chat:llm] LLM HTTP error: %s", exc, exc_info=True)
        raise RuntimeError("LLM request failed") from exc


_SUMMARY_SYSTEM_PROMPT = (
    "Eres un asistente de alertas de emergencia para México. "
    "Dado los datos de una alerta, genera un resumen conciso y útil para el ciudadano afectado. "
    "Reglas estrictas: máximo 3 oraciones; español claro y directo; sin jerga técnica; "
    "sin emojis; no repitas el título textualmente; no inventes datos que no estén en los datos proporcionados."
)

_SUMMARY_MAX_CHARS = 600


async def alert_summary(db, alert_id: str) -> str:
    alert = await get_alert_by_id(db, alert_id)
    if alert is None:
        raise ValueError("alert_not_found")

    payload = json.dumps({
        "titulo": alert["title"],
        "descripcion": alert.get("short", ""),
        "nivel": alert["level"],
        "factores": alert.get("factors", []),
        "recomendaciones": alert.get("recommendations", []),
    }, ensure_ascii=False)

    messages = [
        {"role": "system", "content": _SUMMARY_SYSTEM_PROMPT},
        {"role": "user",   "content": f"Genera un resumen de esta alerta:\n{payload}"},
    ]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url=f"{settings.LLM_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.LLM_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"model": settings.LLM_MODEL, "messages": messages},
                timeout=30.0,
            )
            data = response.json()
            if "choices" not in data:
                raise RuntimeError(f"LLM returned no choices: {data}")
            summary = data["choices"][0]["message"]["content"]
            return summary[:_SUMMARY_MAX_CHARS]
    except RuntimeError:
        raise
    except Exception as exc:
        logger.error("alert_summary LLM call failed: %s", exc, exc_info=True)
        raise RuntimeError("llm_unavailable")
