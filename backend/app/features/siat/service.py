"""
SIAT-CT service.

Orchestrates: provider fetch → per-user evaluation → DB persistence → per-user push.

Notification strategy (v1.1):
  - device_tokens.user_id is populated at token-registration time; notifications
    are targeted per user (NOT broadcast).
  - A push is sent only when the highest detected level *increases* vs. the
    previous cycle for that user.
  - Minimum level to notify: VERDE (2) — AZUL is informational only.
  - Data source: NHC CurrentStorms.json. There is no official Mexican
    SIAT-CT API; the level/color mapping is derived locally from proximity +
    ETA using the official SIAT-CT 5-step scale (Azul → Rojo).
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

from firebase_admin import messaging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.features.siat.evaluator import evaluate_user, haversine_km
from app.features.siat.providers.nhc import fetch_active_cyclones
from app.features.notifications.service import get_tokens_for_users
from app.features.notification_preferences.service import get_preferences

logger = logging.getLogger(__name__)

_NOTIFY_MIN_LEVEL = 2  # VERDE and above trigger push

_COLOR_LABELS = {
    "AZUL": "Azul",
    "VERDE": "Verde",
    "AMARILLO": "Amarillo",
    "NARANJA": "Naranja",
    "ROJO": "Rojo",
}


# ---------------------------------------------------------------------------
# Table setup
# ---------------------------------------------------------------------------

async def ensure_siat_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS cyclone_events (
                id                  SERIAL PRIMARY KEY,
                source              VARCHAR(50)  NOT NULL,
                name                VARCHAR(100) NOT NULL,
                status              VARCHAR(100),
                lat                 DOUBLE PRECISION NOT NULL,
                lon                 DOUBLE PRECISION NOT NULL,
                wind_kmh            DOUBLE PRECISION,
                pressure            INT,
                movement_direction  VARCHAR(20),
                movement_speed_kmh  DOUBLE PRECISION,
                advisory_time       TIMESTAMPTZ,
                raw_payload         JSONB,
                created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (source, name)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS siat_assessments (
                id               SERIAL PRIMARY KEY,
                user_id          BIGINT  NOT NULL,
                cyclone_event_id INT     NOT NULL,
                siat_level       INT     NOT NULL,
                siat_color       VARCHAR(20) NOT NULL,
                reason           TEXT,
                distance_km      DOUBLE PRECISION,
                eta_hours        DOUBLE PRECISION,
                source_mode      VARCHAR(20) NOT NULL DEFAULT 'derived',
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE (user_id, cyclone_event_id)
            )
        """))

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_alert_states (
                user_id              BIGINT PRIMARY KEY,
                current_level        INT         NOT NULL DEFAULT 1,
                siat_color           VARCHAR(20) NOT NULL DEFAULT 'AZUL',
                last_notified_level  INT,
                last_notified_at     TIMESTAMPTZ,
                active_cyclone_id    INT,
                updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text(
            "ALTER TABLE alerts ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ"
        ))
    logger.info("SIAT tables verified/created")


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _coerce_datetime(val) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return datetime.now(timezone.utc)


async def _save_cyclone(db: AsyncSession, cyclone: dict) -> int:
    """Upsert cyclone: if same source+name already exists, update position/intensity."""
    result = await db.execute(
        text("""
            INSERT INTO cyclone_events
                (source, name, status, lat, lon, wind_kmh, pressure,
                 movement_direction, movement_speed_kmh, advisory_time, raw_payload)
            VALUES
                (:source, :name, :status, :lat, :lon, :wind_kmh, :pressure,
                 :movement_direction, :movement_speed_kmh, :advisory_time, CAST(:raw_payload AS jsonb))
            ON CONFLICT (source, name) DO UPDATE SET
                status             = EXCLUDED.status,
                lat                = EXCLUDED.lat,
                lon                = EXCLUDED.lon,
                wind_kmh           = EXCLUDED.wind_kmh,
                pressure           = EXCLUDED.pressure,
                movement_direction = EXCLUDED.movement_direction,
                movement_speed_kmh = EXCLUDED.movement_speed_kmh,
                advisory_time      = EXCLUDED.advisory_time,
                raw_payload        = EXCLUDED.raw_payload
            RETURNING id
        """),
        {
            "source": cyclone["source"],
            "name": cyclone["name"],
            "status": cyclone["status"],
            "lat": cyclone["lat"],
            "lon": cyclone["lon"],
            "wind_kmh": cyclone.get("wind_kmh"),
            "pressure": cyclone.get("pressure"),
            "movement_direction": cyclone.get("movement_direction"),
            "movement_speed_kmh": cyclone.get("movement_speed_kmh"),
            "advisory_time": _coerce_datetime(cyclone.get("advisory_time")),
            "raw_payload": json.dumps(cyclone.get("raw_payload", {})),
        },
    )
    return result.mappings().first()["id"]


async def _get_users_with_location(db: AsyncSession) -> list:
    result = await db.execute(
        text("SELECT id, lat, lon FROM users WHERE lat IS NOT NULL AND lon IS NOT NULL")
    )
    return result.mappings().all()


async def get_affected_users(
    db: AsyncSession, lat: float, lon: float, radius_km: float = 500.0
) -> list[dict]:
    """Return users within radius_km of (lat, lon), sorted by distance ascending."""
    users = await _get_users_with_location(db)
    within = []
    for user in users:
        dist = haversine_km(lat, lon, user["lat"], user["lon"])
        if dist <= radius_km:
            within.append({"user_id": user["id"], "distance_km": round(dist, 2)})
    within.sort(key=lambda x: x["distance_km"])
    return within


async def _get_user_state(db: AsyncSession, user_id: int) -> dict | None:
    result = await db.execute(
        text("SELECT current_level FROM user_alert_states WHERE user_id = :uid"),
        {"uid": user_id},
    )
    return result.mappings().first()


async def _upsert_user_state(
    db: AsyncSession, user_id: int, level: int, color: str, cyclone_id: int
) -> None:
    await db.execute(
        text("""
            INSERT INTO user_alert_states (user_id, current_level, siat_color, active_cyclone_id)
            VALUES (:uid, :level, :color, :cid)
            ON CONFLICT (user_id) DO UPDATE SET
                current_level     = :level,
                siat_color        = :color,
                active_cyclone_id = :cid,
                updated_at        = NOW()
        """),
        {"uid": user_id, "level": level, "color": color, "cid": cyclone_id},
    )


async def _save_assessment(
    db: AsyncSession, user_id: int, cyclone_id: int, result: dict
) -> None:
    """Upsert assessment: one row per user+cyclone, updated on each re-run."""
    await db.execute(
        text("""
            INSERT INTO siat_assessments
                (user_id, cyclone_event_id, siat_level, siat_color,
                 reason, distance_km, eta_hours, source_mode)
            VALUES
                (:uid, :cid, :level, :color, :reason, :dist, :eta, 'derived')
            ON CONFLICT (user_id, cyclone_event_id) DO UPDATE SET
                siat_level  = EXCLUDED.siat_level,
                siat_color  = EXCLUDED.siat_color,
                reason      = EXCLUDED.reason,
                distance_km = EXCLUDED.distance_km,
                eta_hours   = EXCLUDED.eta_hours,
                created_at  = NOW()
        """),
        {
            "uid": user_id,
            "cid": cyclone_id,
            "level": result["siat_level"],
            "color": result["siat_color"],
            "reason": result["reason"],
            "dist": result["distance_km"],
            "eta": result["eta_hours"],
        },
    )


async def _mark_notified(db: AsyncSession, user_id: int, level: int) -> None:
    await db.execute(
        text("""
            UPDATE user_alert_states
            SET last_notified_level = :level, last_notified_at = NOW()
            WHERE user_id = :uid
        """),
        {"level": level, "uid": user_id},
    )


# ---------------------------------------------------------------------------
# Push notification — per-user (not broadcast)
# ---------------------------------------------------------------------------

async def _push_per_user(
    escalations: dict[int, dict],
    token_map: dict[int, list[str]],
) -> int:
    """
    Send targeted push to each escalated user using only their own tokens.
    Users without registered tokens are silently skipped.
    """
    total_sent = 0

    for user_id, assessment in escalations.items():
        tokens = token_map.get(user_id)
        if not tokens:
            logger.debug("user_id=%d has no registered tokens, skipping push", user_id)
            continue

        label = _COLOR_LABELS.get(assessment["siat_color"], assessment["siat_color"])
        msg = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=f"Alerta SIAT-CT {label}",
                body=assessment["reason"],
            ),
            data={
                "siat_level": str(assessment["siat_level"]),
                "siat_color": assessment["siat_color"],
            },
            tokens=tokens,
        )

        try:
            response = await asyncio.to_thread(messaging.send_each_for_multicast, msg)
            logger.info(
                "Push → user_id=%d level=%s color=%s success=%d failure=%d",
                user_id, assessment["siat_level"], assessment["siat_color"],
                response.success_count, response.failure_count,
            )
            if response.failure_count:
                failed = [tokens[i] for i, r in enumerate(response.responses) if not r.success]
                logger.warning("Push failures for user_id=%d: %s", user_id, failed[:5])
            total_sent += response.success_count
        except Exception as exc:
            logger.error("Firebase push failed for user_id=%d: %s", user_id, exc, exc_info=True)

    return total_sent


# ---------------------------------------------------------------------------
# SMN/CONAGUA alerts → geocercado push
# ---------------------------------------------------------------------------

_SMN_RADIUS_KM = 500.0


async def _get_pending_smn_alerts(db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT id, title, short, level, lat, lon
        FROM alerts
        WHERE lat IS NOT NULL
          AND lon IS NOT NULL
          AND notified_at IS NULL
          AND timestamp > NOW() - INTERVAL '35 minutes'
        ORDER BY timestamp DESC
    """))
    return result.mappings().all()


async def _mark_alert_notified(db: AsyncSession, alert_id) -> None:
    await db.execute(
        text("UPDATE alerts SET notified_at = NOW() WHERE id = :id"),
        {"id": alert_id},
    )


async def _push_smn_for_alert(
    db: AsyncSession, alert: dict, users: list
) -> int:
    affected_user_ids = []
    for user in users:
        dist = haversine_km(alert["lat"], alert["lon"], user["lat"], user["lon"])
        if dist > _SMN_RADIUS_KM:
            continue
        prefs = await get_preferences(db, user["id"])
        if prefs["siat_enabled"] and alert["level"] >= prefs["min_siat_level"]:
            affected_user_ids.append(user["id"])

    if not affected_user_ids:
        return 0

    token_map = await get_tokens_for_users(db, affected_user_ids)
    all_tokens = [t for tokens in token_map.values() for t in tokens]
    if not all_tokens:
        return 0

    msg = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=f"Nueva alerta — {alert['title']}",
            body=alert["short"],
        ),
        data={
            "alert_id": str(alert["id"]),
            "level": str(alert["level"]),
            "siat_level": str(alert["level"]),
        },
        android=messaging.AndroidConfig(priority="high"),
        apns=messaging.APNSConfig(
            headers={"apns-priority": "10"},
        ),
        tokens=all_tokens,
    )

    total_sent = 0
    try:
        response = await asyncio.to_thread(messaging.send_each_for_multicast, msg)
        total_sent = response.success_count
        logger.info(
            "SMN push alert_id=%s level=%d users=%d success=%d failure=%d",
            alert["id"], alert["level"], len(affected_user_ids),
            response.success_count, response.failure_count,
        )
        if response.failure_count:
            failed = [all_tokens[i] for i, r in enumerate(response.responses) if not r.success]
            logger.warning("SMN push failures alert_id=%s: %s", alert["id"], failed[:5])
    except Exception as exc:
        logger.error("SMN push failed for alert_id=%s: %s", alert["id"], exc, exc_info=True)

    if total_sent > 0:
        await _mark_alert_notified(db, alert["id"])

    return total_sent


async def _notify_smn_alerts(db: AsyncSession, users: list) -> int:
    if not users:
        return 0

    alerts = await _get_pending_smn_alerts(db)
    if not alerts:
        logger.debug("SMN: no pending alerts")
        return 0

    total_sent = 0
    for alert in alerts:
        total_sent += await _push_smn_for_alert(db, alert, users)

    return total_sent


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

async def run_cycle(db: AsyncSession) -> dict:
    logger.info("SIAT run-cycle started")

    users = await _get_users_with_location(db)
    cyclones = await fetch_active_cyclones()

    logger.info("SIAT run-cycle: %d cyclone(s), %d user(s) with location", len(cyclones), len(users))

    all_assessments: list[dict] = []
    escalations: dict[int, dict] = {}  # user_id → highest assessment this cycle

    for cyclone in (cyclones if users else []):
        try:
            cyclone_id = await _save_cyclone(db, cyclone)
            logger.info("Cyclone saved: id=%d name=%s status=%s", cyclone_id, cyclone["name"], cyclone["status"])
        except Exception as exc:
            logger.error("Failed to save cyclone %s: %s", cyclone.get("name"), exc, exc_info=True)
            continue

        for user in users:
            try:
                assessment = evaluate_user(user["lat"], user["lon"], cyclone)

                if assessment.get("out_of_range"):
                    logger.debug(
                        "user_id=%d: cyclone %s out of range (%.0f km), skipping assessment",
                        user["id"], cyclone["name"], assessment["distance_km"],
                    )
                    continue

                old_state = await _get_user_state(db, user["id"])
                old_level = old_state["current_level"] if old_state else None
                new_level = assessment["siat_level"]

                logger.debug(
                    "user_id=%d cyclone=%s dist=%.1fkm eta=%s level=%s→%s",
                    user["id"], cyclone["name"],
                    assessment["distance_km"],
                    f"{assessment['eta_hours']:.1f}h" if assessment["eta_hours"] else "N/A",
                    old_level, new_level,
                )

                await _save_assessment(db, user["id"], cyclone_id, assessment)
                await _upsert_user_state(db, user["id"], new_level, assessment["siat_color"], cyclone_id)

                if new_level >= _NOTIFY_MIN_LEVEL and (old_level is None or new_level > old_level):
                    prefs = await get_preferences(db, user["id"])
                    if prefs["siat_enabled"] and new_level >= prefs["min_siat_level"]:
                        prev = escalations.get(user["id"])
                        if prev is None or new_level > prev["siat_level"]:
                            escalations[user["id"]] = assessment
                            logger.info(
                                "Escalation queued: user_id=%d %s→%s (%s)",
                                user["id"], old_level, new_level, assessment["siat_color"],
                            )
                    else:
                        logger.debug(
                            "user_id=%d: push filtered by prefs (siat_enabled=%s, min_siat_level=%d, got=%d)",
                            user["id"], prefs["siat_enabled"], prefs["min_siat_level"], new_level,
                        )

                all_assessments.append({**assessment, "user_id": user["id"]})

            except Exception as exc:
                logger.error(
                    "Failed to evaluate user_id=%d for cyclone %s: %s",
                    user["id"], cyclone.get("name"), exc, exc_info=True,
                )
                continue

    notifications_sent = 0
    if escalations:
        token_map = await get_tokens_for_users(db, list(escalations.keys()))
        notifications_sent = await _push_per_user(escalations, token_map)
        for user_id, assessment in escalations.items():
            await _mark_notified(db, user_id, assessment["siat_level"])
    else:
        logger.info("SIAT run-cycle: no escalations, no push sent")

    notifications_sent += await _notify_smn_alerts(db, users)

    await db.commit()

    logger.info(
        "SIAT run-cycle complete: cyclones=%d users=%d notifications=%d",
        len(cyclones), len(users), notifications_sent,
    )

    return {
        "cyclones_found": len(cyclones),
        "users_evaluated": len(users),
        "notifications_sent": notifications_sent,
        "assessments": all_assessments,
    }


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

async def get_user_siat_status(db: AsyncSession, user_id: int) -> dict | None:
    result = await db.execute(
        text("SELECT * FROM user_alert_states WHERE user_id = :uid"),
        {"uid": user_id},
    )
    return result.mappings().first()
