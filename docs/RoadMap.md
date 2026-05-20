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

## Shipped (2026-05-20)

- [x] Streaming online AI responses via SSE (FastAPI passthrough + react-native-sse)
- [x] Stop button mid-stream with proper cancellation chain
- [x] Branding: BluEye → Bluai in all user-facing AI system prompts
- [x] Disk space check before offline AI download (2.5GB / 1GB threshold by model)
- [x] Graceful no-model + offline fallback (red inline error, no silent foot-gun)
- [x] retryDownload cleans executorch partial files before retrying (fixes "Already downloading this file")
- [x] Offline AI confirmed working in production on low-tier Android (downloads + offline inference)
- [x] Hide non-functional Subscription screen from production
- [x] Hide demo AlarmScreen entry in Settings
- [x] Keyboard handling for ChatAI (KeyboardProvider + keyboard-controller)

---

## Sprint 2

### Infra & tooling
- [ ] Staging railway / migrate to GCP + Staging
- [ ] npm → pnpm for vulnerability hygiene
- [ ] Fix existing package vulnerabilities (dependabot)
- [ ] Fix Mixpanel project token + verify tracking works
- [ ] ghstack / Graphite tooling for PR management?

### iOS launch chain
- [ ] iOS launch (full pipeline E2E once Apple Dev access resolved)

### Notifications
- [ ] Native alarm-style notifications (iOS + Android)

### AI screen polish
- [ ] Migrate ChatAI to inverted FlashList (eliminates auto-scroll bug class; standard chat pattern — WhatsApp, iMessage, ChatGPT)
- [ ] 3-dots "typing" animation in place of spinner while waiting for first token
- [ ] Cancel/abort button for offline AI download in progress
- [ ] Resumable offline AI downloads (investigate `react-native-executorch` resume API or migrate to `expo-file-system` `DownloadResumable`)
- [ ] Move offline AI space check to app-startup recovery path (currently only fires on first opt-in, not on auto-restart after partial download)
- [ ] Migrate `expo-file-system` calls from legacy import to new File/Directory API (SDK 54+)
- [ ] Toggle for user to force offline vs online AI manually
- [ ] Token/usage limit guardrail for online AI (cost protection)

### Features
- [ ] SOS feature
- [ ] Bluetooth mesh (v1.1, per sprint philosophy)
- [ ] Revenue Cat / pagos (post-launch)

---

## Known gaps (documented limitations)

- **MapMarker OOM**: app crashes after sustained map use due to `react-native-maps` re-rendering custom marker bitmaps. Delegated to Val — fix with `tracksViewChanges={false}` on `<Marker>` components.
- **Offline AI download non-resumable + network-blip restarts**: any network interruption during the 5-7 minute download forces a restart from 0% (observed on Pixel 7 with "Software caused connection abort"). On cellular/flaky wifi this will hit users frequently. Combined with the no-resume limitation, real-world download success on lower-quality networks may be poor. Listed in AI screen polish for Sprint 2.
- **Offline AI moveAsync failure after dirty install**: if app is reinstalled over existing install, executorch's move-from-cache-to-files step can fail with `ERR_FILE_SYSTEM_CANNOT_MOVE_FILE`. Workaround: `adb uninstall` + reinstall, or user-facing optOut/optIn flow which already calls `deleteResources`. Not a regular-user-facing issue, only affects dev/QA flows.
- **retryDownload "Already downloading this file" residual**: tonight's retry cleanup deletes partial files via `deleteResources`, but executorch's in-memory download lock can survive that, causing the next retry to fail with code 181. 100ms preventLoad wait isn't always enough. User recovery path: Settings → Eliminar modelo IA (full optOut path) → re-opt-in. Possible Sprint 2 fix: longer wait, or explicit executorch cancel API if one exists.
- **Offline AI inference latency on low-tier hardware**: several seconds per response. Inherent to running a 1B/3B model on phone hardware. Document as expected behavior; consider longer "Pensando..." messaging if UX complaints arise.
- **`BasicLLM` type narrowing**: TS doesn't see `sendMessage`/`response`/`isGenerating` on the offline LLM because the type was hand-narrowed in `ModelContext.tsx`. Runtime works fine. Cleanup: extend the type to match real executorch shape.
