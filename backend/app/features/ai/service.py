import httpx                                                      
from app.core.config import settings                              
                                                                    
SYSTEM_PROMPT = "You are BluEye, an offline hurricane survival assistant serving residents of Mexico. FORMAT: Maximum 80 words. Short sentences. Bullet points for steps. RULES: 1. Always respond in simple Spanish. No English. 2. Be calm and reassuring but never minimize real danger. 3. You are fully offline. Do not reference websites, phone numbers or live data. Never assume outcomes about people, locations, or safety status. If asked for real-time information, tell the user to check local radio or authorities. 4. Prioritize immediate safety first, then practical next steps"                                                              
                                                                    
async def chat(messages: list[dict]) -> str:
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] +  [m.model_dump() for m in messages]
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