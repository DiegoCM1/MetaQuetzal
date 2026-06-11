import json
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


def _smn_headline_to_level(headline: str) -> int:
    """Derive SIAT level (1-5) from SMN headline keywords."""
    hl = headline.upper()
    if any(k in hl for k in ("ROJO", "EXTREM", "EXCEPCIONAL", "CATEGORÍA 4", "CATEGORÍA 5")):
        return 5
    if any(k in hl for k in ("NARANJA", "SEVER", "GRAVE", "HURACÁN", "HURACAN")):
        return 4
    if any(k in hl for k in ("AMARILLO", "MODERADO", "FUERTE", "INTENSO", "INTENSA", "TORMENTA TROPICAL")):
        return 3
    return 2  # VERDE — default para boletín informativo


async def persist_smn_bulletin_if_new(db: AsyncSession, bulletin: dict) -> bool:
    """
    Insert an SMN bulletin into the alerts table if it hasn't been persisted yet.
    Returns True when a new row was inserted, False when it already existed.
    SMN alerts have no specific lat/lon (national scope).
    """
    aviso_num = bulletin.get("aviso_num")
    if aviso_num:
        title = f"SMN Aviso #{aviso_num}"
        existing = await db.execute(
            text("SELECT id FROM alerts WHERE title = :title AND timestamp > NOW() - INTERVAL '26 hours'"),
            {"title": title},
        )
    else:
        headline = bulletin.get("headline") or ""
        title = f"SMN: {headline[:240]}"
        existing = await db.execute(
            text("SELECT id FROM alerts WHERE title = :title AND timestamp > NOW() - INTERVAL '4 hours'"),
            {"title": title},
        )

    if existing.mappings().first():
        logger.debug("SMN bulletin already persisted: '%s'", title)
        return False

    level = _smn_headline_to_level(bulletin.get("headline") or "")
    short = (bulletin.get("summary") or bulletin.get("headline") or "Boletín del SMN/CONAGUA")[:500]

    await db.execute(
        text("""
            INSERT INTO alerts (level, score, title, short, lat, lon, factors, recommendations)
            VALUES (:level, 0, :title, :short, NULL, NULL, '[]', '[]')
        """),
        {"level": level, "title": title, "short": short},
    )
    await db.commit()
    logger.info("SMN bulletin persisted: level=%d title='%s'", level, title)
    return True


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


