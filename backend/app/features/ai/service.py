import httpx
from app.core.config import settings

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

async def chat(messages: list[dict], location: str | None = None) -> str:
    system_content = SYSTEM_PROMPT
    if location:
        system_content += f"\n\nUbicación actual del usuario: {location}."
    print(f"[chat] location received: {location}")
    print(f"[chat] system prompt tail: ...{system_content[-100:]}")
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
        return data["choices"][0]["message"]["content"]
