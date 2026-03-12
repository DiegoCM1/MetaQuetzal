from fastapi import Header, HTTPException
from app.core.config import settings

async def verify_api_key(x_api_key:str = Header(...)):
    if x_api_key != settings.NOTIF_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return