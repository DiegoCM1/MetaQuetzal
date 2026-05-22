from datetime import datetime, time, timezone
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_DEFAULTS: dict = {
    "siat_enabled": True,
    "min_siat_level": 2,
    "map_events_enabled": True,
    "quiet_hours_enabled": False,
    "quiet_start": None,
    "quiet_end": None,
}


def is_within_quiet_hours(prefs: dict, _now: "time | None" = None) -> bool:
    """Return True if current UTC time falls within the user's quiet hours window.

    _now is injected in tests to avoid mocking datetime.
    """
    if not prefs.get("quiet_hours_enabled"):
        return False
    qs = prefs.get("quiet_start")
    qe = prefs.get("quiet_end")
    if not qs or not qe:
        return False
    h0, m0 = map(int, qs.split(":"))
    h1, m1 = map(int, qe.split(":"))
    start_t = time(h0, m0)
    end_t = time(h1, m1)
    if _now is None:
        now_utc = datetime.now(timezone.utc).time()
        now_t = time(now_utc.hour, now_utc.minute)
    else:
        now_t = _now
    if start_t <= end_t:
        return start_t <= now_t < end_t
    else:
        # overnight range: e.g. 22:00 → 07:00
        return now_t >= start_t or now_t < end_t


async def get_preferences(db: AsyncSession, user_id: int) -> dict:
    result = await db.execute(
        text("""
            SELECT siat_enabled, min_siat_level, map_events_enabled,
                   quiet_hours_enabled, quiet_start, quiet_end
            FROM notification_preferences
            WHERE user_id = :user_id
        """),
        {"user_id": user_id},
    )
    row = result.mappings().first()
    if row is None:
        return dict(_DEFAULTS)
    d = dict(row)
    for field in ("quiet_start", "quiet_end"):
        val = d.get(field)
        if val is not None and hasattr(val, "strftime"):
            d[field] = val.strftime("%H:%M")
    return d


async def upsert_preferences(db: AsyncSession, user_id: int, updates: dict) -> dict:
    current = await get_preferences(db, user_id)
    merged = {**current, **updates}
    if merged.get("quiet_hours_enabled") and (not merged.get("quiet_start") or not merged.get("quiet_end")):
        raise ValueError("quiet_hours_require_times")
    await db.execute(
        text("""
            INSERT INTO notification_preferences
                (user_id, siat_enabled, min_siat_level, map_events_enabled,
                 quiet_hours_enabled, quiet_start, quiet_end, updated_at)
            VALUES
                (:user_id, :siat_enabled, :min_siat_level, :map_events_enabled,
                 :quiet_hours_enabled, :quiet_start, :quiet_end, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                siat_enabled        = EXCLUDED.siat_enabled,
                min_siat_level      = EXCLUDED.min_siat_level,
                map_events_enabled  = EXCLUDED.map_events_enabled,
                quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
                quiet_start         = EXCLUDED.quiet_start,
                quiet_end           = EXCLUDED.quiet_end,
                updated_at          = NOW()
        """),
        {"user_id": user_id, **merged},
    )
    await db.commit()
    return merged
