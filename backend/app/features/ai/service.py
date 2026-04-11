import httpx
from app.core.config import settings
from app.features.ai.rag import retrieve

SYSTEM_PROMPT = """You are BluEye, an AI assistant specialized in hurricane preparedness, response, and recovery for residents of Mexico.

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


async def chat(messages: list[dict], location: str | None = None, latitude: float | None = None, longitude: float | None = None) -> str:
    system_content = SYSTEM_PROMPT

    # Location injection
    if location:
        system_content += f"\n\nUbicación actual del usuario: {location}."
    print(f"[chat:location] location received: {location}")

    #  Weather injection
    if latitude and longitude:
        try:
            weather = await fetch_weather(latitude, longitude)
            system_content += f"\n\n{weather}"
            print(f"[chat:weather] weather: {weather}")
        except Exception as e:
            print(f"[chat:weather] weather fetch failed: {e}")

    # RAG, Chunks injection
    try: 
        retrieved_chunks_list = retrieve(messages[-1].content)

        normalized_chunks = "\n\n".join(retrieved_chunks_list)

        message_for_ai = f"This is some additional context: {normalized_chunks}"

        system_content += f"\n\n{message_for_ai}"
        print(f"[chat:rag] RAG chunks injected: {len(retrieved_chunks_list)}")
    except Exception as e:
        print(f"[chat:rag] RAG failed: {e}")

    


    print(f"[chat] system prompt tail: ...{system_content[-500:]}")
    print(f"[chat] messages count: {len(messages)}")
    full_messages = [{"role": "system", "content": system_content}] + [m.model_dump() for m in messages]
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url=f"{settings.LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": full_messages,
            },
            timeout=30.0,
        )
        data = response.json()

        if "choices" not in data:
            print(f"[chat:llm] unexpected response: {data}")
            raise RuntimeError(f"[chat:llm] LLM returned no choices: {data}")

        return data["choices"][0]["message"]["content"]
