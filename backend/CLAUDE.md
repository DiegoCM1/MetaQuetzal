# CLAUDE.md — backend

This file supplements the root `CLAUDE.md` with backend-specific guidance. Read both.

## Feature-folder pattern

Each feature is a folder under `app/features/<name>/` with three files:
- `router.py` — FastAPI routes (the HTTP contract)
- `service.py` — business logic + DB access
- `schemas.py` — Pydantic request/response models

To add a feature: create the folder, then import its router in `app/main.py` and call `app.include_router(...)`. Shared infra lives in `app/core/` (`auth`, `config`, `database`, `firebase`) and `app/middleware/` (`api_key_auth`).

## Database — NO migration tool

Schema is created imperatively at startup in `ensure_core_tables()` and `ensure_siat_tables()` inside `app/main.py`'s `lifespan`. **To add a table or column, add a statement there:**
- New table → `CREATE TABLE IF NOT EXISTS ...`
- New column on an existing table → `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`

**Do not reach for Alembic — it isn't used.** Async stack: SQLAlchemy async + asyncpg. Get a session via the `get_db` dependency in routes, or `AsyncSessionLocal()` in background tasks. `user_id` columns reference `users.id` (BIGINT).

## Auth

- **Firebase is the standard.** Routes verify Firebase ID tokens via `app.core.firebase`. A new router should reuse the same Firebase dependency the live features use (see `map_events/router.py` or `notification_preferences/router.py`).
- **Internal/admin endpoints** (no Firebase user) authenticate with an API key via `app/middleware/api_key_auth.py` (`NOTIF_API_KEY`). Use this for things like notification test triggers.
- **Don't copy from `app/features/future_integration/` (sos, chat_rooms).** It's unmounted dead code using password-based auth (`password_hash`), being rebuilt on Firebase this sprint. Reference the live Firebase routers instead, not this folder.

## Background work

`app/main.py`'s `lifespan` spawns `_siat_background_loop`, which runs `run_cycle` every 30 minutes (evaluate cyclones → send pushes). It is a background task, not request-driven — don't expect SIAT pushes to fire from an HTTP call.

## Tests

- Run with `pytest` (config in `pytest.ini`: `pythonpath = .`, pytest-asyncio enabled).
- **`conftest.py` stubs `sentence_transformers` and `firebase_admin`** so tests can `from app.main import app` without downloading ~1GB of torch or hitting real Firebase. **Do not remove these stubs.**
- The AI router is imported under `try/except` in `main.py` for the same heavy-dependency reason — keep it optional.
- **CI runs `pytest` on every PR** against a Postgres service (`.github/workflows/backend-tests.yml`).
