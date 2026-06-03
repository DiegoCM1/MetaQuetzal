# SOS Feature — Reference Code (NOT wired in)

This folder was extracted from Edgar's branch (`feat/Tarea3y5-backend-siat`) for review purposes.

## Status: REFERENCE ONLY

**Do not import or register this router in main.py yet.**

## Why it's blocked

The current implementation uses password-based auth (`password_hash` in users table).
BluEye's auth strategy is **Firebase Auth** — the backend verifies Firebase JWTs, it does not store passwords.

This entire feature depends on a working login system. Once Firebase Auth is implemented:

1. Replace `get_current_user` dependency with the Firebase-based version
2. Remove any `password_hash` references
3. Wire router into `main.py`
4. Write integration tests before enabling in production

## What's in here

- `router.py` — REST endpoints: POST /sos, GET /sos/me, GET /sos, PATCH /sos/{id}/resolve
- `service.py` — DB layer: create, list, resolve, list_by_user
- `schemas.py` — Pydantic models: SOSCreate, SOSResponse, SOSResolve

The logic itself is solid. The blocker is auth, not the SOS business logic.
