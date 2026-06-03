# Future Integration

Features extracted from Edgar's branch (`feat/Tarea3y5-backend-siat`) for post-launch implementation.

**Not wired into main.py. Not active. Do not import.**

## sos/
Emergency SOS button — records user location, allows resolving/cancelling events.
Blocked by: Firebase Auth (needs authenticated user_id, currently uses password-based auth).

## chat/
Group chat rooms — users can create rooms, join them, send messages to each other.
Blocked by: Firebase Auth + out of scope for Play Store launch (April 30, 2026).
Target: v2.
