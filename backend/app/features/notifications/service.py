from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from firebase_admin import messaging

async def push_token(db: AsyncSession, token: str):
    result = await db.execute(text("""INSERT INTO device_tokens (token)
    VALUES (:token)
    ON CONFLICT (token)
    DO UPDATE SET updated_at = NOW()"""), 
    {"token": token})

    await db.commit()

    return None



async def send_all_notifications(db: AsyncSession, title:str, body:str, data:dict[str, str]):
    # Query to db to get all tokens
    result = await db.execute(text("SELECT token FROM device_tokens"))
    rows = result.mappings().all()
    tokens = []
    for row in rows:
        tokens.append(row["token"])

    if not tokens:
        raise HTTPException(status_code=404, detail="No tokens registered")


    # Sending a notification to all of the tokens
    message = messaging.MulticastMessage(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        tokens=tokens,
    )
    response = messaging.send_each_for_multicast(message)

    # Cleaning up missing/bad tokens
    invalid_tokens = []
    for i, r in enumerate(response.responses):
        if not r.success:
            invalid_tokens.append(tokens[i])
    
    if invalid_tokens:
        await db.execute(text("DELETE FROM device_tokens WHERE token = ANY(CAST(:tokens AS text[]))"),
        {"tokens": invalid_tokens})
        
        await db.commit()

    return {
        "success_count": response.success_count,
        "failure_count": response.failure_count
    }