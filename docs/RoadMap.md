# BluAI — Roadmap & Reference

App de alertas para temporada de huracanes. Hecha para que la gente sepa cuándo y dónde un ciclón los afecta — en tiempo real, con IA, y sin depender de conexión perfecta.

**Android launch: May 20, 2026 — iOS beta simultánea.**
**Floor (no negociable): June 5, 2026.**

---

## Tech Stack

### Frontend
- Framework: Expo (React Native)
- Local storage: MMKV (not AsyncStorage)
- State: TanStack Query (server state) + Zustand (local/UI state)
- UI: NativeWind + ReactNative Reusables (shadcn-style components)
- Lists: FlashList
- Gestures: React Native Gesture Handler
- Icons: Expo Vector Icons
- Auth: Firebase Auth (Google Sign-In + Apple Sign-In)
- Payments: Revenue Cat (planned post-launch)

### Backend
- Language: Python 3.14
- Framework: FastAPI (fully async)
- Database: PostgreSQL (Railway-hosted)
- ORM: SQLAlchemy (async)
- Auth: Firebase Admin SDK — verifies ID tokens on every request
- Push notifications: Expo Push Notifications API
- Deployment: Railway — manual deploy via `railway up` from `/backend`

### AI
- Online: FastAPI backend, model-agnostic (Llama 4 / Gemini as alternatives)
- Offline: Llama 3.2 1B/3B quantized + fine-tuned (runs on-device)
- Alert summaries: LLM receives raw alert data → returns user-facing explanation

### Alerts & Weather
- Cyclone tracking: SMN/CONAGUA (HTML scrape, 30-min cache) + NHC/NOAA
- Weather: OpenWeather One Call (pay-as-you-go)
- Architecture is plug-and-play — swap providers without touching business logic

---

## Architecture

Feature-based. Each feature owns its router, service, schemas, and tests. No cross-feature imports except through explicit service calls.

```
backend/app/
  core/           — DB engine, Firebase auth, config
  features/
    alerts/       — cyclone alerts from SMN/CONAGUA + OpenWeather
    siat/         — SIAT-CT evaluator (30-min background loop, haversine geofence)
    notifications/— Expo push tokens + geocenced notification dispatch
    users/        — Firebase UID → DB profile, lat/lon storage
    ai/           — LLM alert summary endpoint
    feedback/     — user feedback collection
  middleware/     — API key auth for internal endpoints
```

### Key constraints
- **Single worker**: Procfile runs 1 uvicorn worker. SIAT background loop must not run in duplicate. Never add `--workers N` without redesigning SIAT to use an external scheduler.
- **SIAT cycle**: Runs every 30 minutes. Evaluates all users with location set using haversine distance. Max threat radius: 1500km. Out-of-range flag at that threshold.
- **API versioning**: All endpoints use `/api/v1/` prefix. Legacy unversioned paths exist as deprecated aliases during the Play Store testing window — remove ~2-3 weeks after testers update.
- **Push token requirement**: User must have a DB profile (`POST /api/v1/users/me`) before registering a push token. Token is associated to user_id, not just firebase_uid.

---

## Branch & CI Strategy

```
main      — production. Protected. Requires PR + CI green.
dev       — integration branch. All features merge here first.
<feature> — one branch per feature. Max 200 lines per PR.
```

- GitHub Actions runs `pytest` on every PR to `dev` and `main`
- Diego reviews every PR touching: auth, DB schema, AI, navigation, iOS pipeline
- No force-push to main. No --no-verify.

---

## Sprint 1 — May 3 → May 20, 2026

### Must-Have P1 (blockers — no launch without these)

| Owner | Feature | Standard |
|---|---|---|
| VAL | Events persist in DB + visible between users | E2E + Test + Device |
| VAL | Layer toggle (existing layers only, no new ones) | E2E + Test + Device |
| VAL | "Report only near me" restriction | E2E + Test + Device |
| EDGAR | Geocenced notifications — alerts only to affected users | E2E + Test + Push real |
| EDGAR | Notification settings: on/off per alert type | E2E + Test + Device |
| EDGAR | AI alert summary — LLM generates user-facing content | E2E + Test + Device |
| DIEGO | Closed testing → production Android | Producción |
| DIEGO | Sign in with Apple (Firebase Apple provider) | E2E + Test + Device |
| DIEGO | iOS pipeline: certs, APNs, EAS build, App Store Connect | Submission |
| DIEGO | Sentry in production — crash telemetry | Evento en dashboard |
| DIEGO | Keystore backup off-machine | Backup verificado |
| DIEGO | Store listings (Play Store + App Store) for hurricane season | Revisado |
| TODOS | Daily bug triage from closed testing | Daily |

### Extensions P2 (v1.0 if pace allows — ordered by priority)

| Owner | Feature |
|---|---|
| VAL | Hurricane trajectory layer (NHC/NOAA, Pacific East Mexico coverage) |
| EDGAR | Advanced notification preferences (by category, granular opt-in, no-disturb) |
| VAL | Waze-style event verification (voting, thresholds, anti-abuse) |
| DIEGO | Email/password login + password recovery |

### Checkpoints
- **May 8 — CP1**: Apple Dev approved? map_events migration merged? First real push sent on device?
- **May 9 — Demo Day**: Each dev demos their feature live on physical device. No simulators. No "casi".
- **May 15 — CP2 GO/NO-GO**: All P1 feature-complete E2E? If red → hire senior, pivot Diego to support.

### Abort Criteria (decided in advance — no debates in the moment)

| # | Trigger | Acción |
|---|---|---|
| 1 | Sessions without crash < 98% on day 17 | Delay launch |
| 2 | Map persistence race condition loses data | Launch without shared events, hotfix v1.1 |
| 3 | Geocenced notifications fail in edge case | Launch with wider radius, fix v1.1 |
| 4 | Google 14-day closed testing not completed | No option — delay |

---

## Definition of Done (applies to every feature)

A feature is **done** only when all five are true:
1. End-to-end functional — backend + frontend integrated
2. At least one happy-path integration test
3. Demoable on physical device (not localhost, not simulator)
4. Definition of Done signed off by dev owner + reviewed by Diego
5. PR ≤ 200 lines — large features broken into multiple PRs

If it doesn't meet all five, it's **WIP** — regardless of what the board says.



---
## Sprint 2
1. Staging railway/migrate to GCP + Staging?
- Native notification system (Like alarms, for both ios and android)
- Npm to pnpm to avoid vulnerabilities
- Fix existing package vulnerabilities spotted by dependabot in GH
- Bluetooth mesh feature → v1.1 (anunciado como v1.1 en sprint philosophy)
- Migrate to ChatAI  1. inverted FlashList (most common in production) How WhatsApp, iMessage, Discord, ChatGPT all do it. Trick: reverse the data so the newest message is index 0,
  render the list inverted (it draws bottom-up). New items appear naturally at the visual bottom — no manual
  scrolling needed. User scrolls down (which is up in the data) to see history.
- Revenue Cat / pagos → post-launch
- SOS
- Limit for online AI
- IOS launch
- Toggle to use offline over online and viceversa, as user wishes
- Fix mixpanel project token and make sure it is actually tracking stuff from this app.
- On ghstack / Graphite tooling for pr management?


Fixes:
- MapMarker OOM error: Te saca de la app después de un tiempo de tenerla abierta
