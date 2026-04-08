from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_alerts(db: AsyncSession, limit: int, offset: int):
    result = await db.execute(text("""SELECT id, timestamp, level, score, title, short
       FROM alerts
      ORDER BY timestamp DESC
      LIMIT :limit OFFSET :offset"""),
      {"limit": limit, "offset": offset})
    
    return result.mappings().all()

async def get_alert_by_id(db: AsyncSession, id):
    result = await db.execute(text("SELECT * FROM alerts WHERE id = :id LIMIT 1"),
    {"id": id})
    return result.mappings().first()


