import json
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


async def create_alert(
    db: AsyncSession,
    level: int, score: int, title: str, short: str,
    lat: float, lon: float, factors: list, recommendations: list,
):
    result = await db.execute(
        text("""
            INSERT INTO alerts (level, score, title, short, lat, lon, factors, recommendations)
            VALUES (:level, :score, :title, :short, :lat, :lon,
                    CAST(:factors AS jsonb), CAST(:recommendations AS jsonb))
            RETURNING id, timestamp, level, score, title, short, lat, lon, factors, recommendations
        """),
        {
            "level": level, "score": score, "title": title, "short": short,
            "lat": lat, "lon": lon,
            "factors": json.dumps(factors),
            "recommendations": json.dumps(recommendations),
        },
    )
    await db.commit()
    return result.mappings().first()


async def get_user_siat_state(db: AsyncSession, user_id: int) -> dict | None:
    """
    Returns the user's current SIAT state joined with the latest assessment reason.
    The reason field contains cyclone name, distance, wind, and ETA — much more
    useful for the /active endpoint than a generic title.
    """
    result = await db.execute(
        text("""
            SELECT uas.current_level, uas.siat_color, uas.updated_at,
                   sa.reason, sa.distance_km, sa.eta_hours
            FROM user_alert_states uas
            LEFT JOIN siat_assessments sa
                ON sa.user_id = uas.user_id
                AND sa.cyclone_event_id = uas.active_cyclone_id
            WHERE uas.user_id = :uid
        """),
        {"uid": user_id},
    )
    return result.mappings().first()


async def get_alerts_with_siat(db: AsyncSession, user_id: int | None, limit: int, offset: int):
    alerts = await get_alerts(db, limit, offset)
    siat_level, siat_color = None, None

    if user_id is not None:
        row = await db.execute(
            text("SELECT current_level, siat_color FROM user_alert_states WHERE user_id = :uid"),
            {"uid": user_id},
        )
        state = row.mappings().first()
        if state:
            siat_level = state["current_level"]
            siat_color = state["siat_color"]

    return [{**dict(a), "siat_level": siat_level, "siat_color": siat_color} for a in alerts]


