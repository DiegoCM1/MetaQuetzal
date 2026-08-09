"""
Schema-completeness guard.
The bug class: a feature queries a table that the startup hook never creates, so it works in an environment whose schema accrued from deploy history (prod) but blows up on a freshly-created database (staging, a teammate's local, this CI Postgres).

What it does: against a clean database, run the exact startup table-creation
functions (`ensure_core_tables` + `ensure_siat_tables`) and assert that every
table the app expects to exist actually got created. If someone adds a feature
that queries a new table but forgets to register its `CREATE TABLE` in the
startup hook, this goes red in CI instead of 500-ing in an environment.

Maintenance contract: when you add a `CREATE TABLE IF NOT EXISTS` to
`ensure_core_tables` (app/main.py) or `ensure_siat_tables`
(app/features/siat/service.py), add the table name to EXPECTED_TABLES below.

Runs against the Postgres service CI already provisions (DATABASE_URL). If no
database is reachable (e.g. a local run with no DB, or one that needs SSL we
don't configure here), the test skips rather than failing — its job is to gate
CI, not to require every developer to have a live DB.
"""
import asyncio

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.main import ensure_core_tables
from app.features.siat.service import ensure_siat_tables

# Every table guaranteed to exist after the startup hooks run on a clean DB.
# Excluded on purpose:
#   - rag_chunks: created conditionally (needs the pgvector extension); skipped
#     by design where pgvector is unavailable, including this CI Postgres.
#   - map_event_votes: created lazily per-request by ensure_map_events_table(),
#     not by the startup hooks, so it is safe without being registered here.
EXPECTED_TABLES = {
    "users",
    "alerts",
    "device_tokens",
    "notification_preferences",
    "map_events",
    "sos_contacts",
    "sos_invitations",
    "sos_events",
    "feedback",
    "cyclone_events",
    "siat_assessments",
    "user_alert_states",
    "subscriptions",
}


async def _existing_public_tables() -> set[str]:
    # Separate engine (not app.core.database.engine) because the app engine
    # forces ssl=require for Neon, which the plain CI Postgres doesn't speak.
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(url)
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))  # fail fast if unreachable
    except Exception as exc:  # no DB reachable -> not this test's job to fail
        await engine.dispose()
        pytest.skip(f"no database reachable for schema check: {exc}")

    try:
        await ensure_core_tables(engine)
        await ensure_siat_tables(engine)
        async with engine.connect() as conn:
            rows = await conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public'"
                )
            )
            return {r[0] for r in rows}
    finally:
        await engine.dispose()


def test_startup_hooks_create_every_expected_table():
    existing = asyncio.run(_existing_public_tables())
    missing = EXPECTED_TABLES - existing
    assert not missing, (
        f"Startup hooks did not create these tables: {sorted(missing)}. "
        "Register their CREATE TABLE in ensure_core_tables/ensure_siat_tables "
        "(and add them to EXPECTED_TABLES if intentional)."
    )
