## SACRED RULE

**Nothing local or staging EVER points at the production database.**

- The prod `DATABASE_URL` lives ONLY in Railway's production environment, injected at deploy time. It never sits on a developer machine, in a local `.env`, or in staging config.
- Why: local and staging run in-progress / integration code that mutates schema (`ensure_core_tables()` runs `ALTER`s at boot) and writes throwaway test data. Pointed at prod, that is corruption and a PII leak of real users.
- Enforcement is *absence*, not a toggle: prod config simply does not exist on a laptop. Do NOT build a "switch" that can flip local/staging to prod — that switch is the accident this whole setup prevents.

## Using staging (teammate setup)

Staging backend URL: `https://backend-blueye-staging.up.railway.app`

To work against staging locally, set up **both** env files from their examples — copy `.env.example` → `.env` and fill **every** key (don't leave blanks):

- **`frontend/.env`** (follow `frontend/.env.example`): set `EXPO_PUBLIC_API_URL` to the staging URL above for frontend-only work, or your laptop LAN IP `http://192.168.x.x:8000` when running a local backend.
- **`backend/.env`** (follow `backend/.env.example`): set `DATABASE_URL` to the staging `/Blueye` branch string (get it from Diego), and `NOTIF_API_KEY` to the staging value.

**Never point either file at production.** (See SACRED RULE above.)

**Deploying to staging:** only the Railway workspace owner (Diego) can `railway up` — Hobby = single-developer workspace. Teammates reach staging *through the deployed app* + the shared staging DB, not by deploying.

## Verify you're actually on staging

**Owner (Diego) — has Railway + DB access:**
- Tail requests: `railway logs --environment staging` while the app is used — calls appear here (and NOT in prod).
- Ironclad: make a write in the app, then confirm the row exists in the staging `/Blueye` branch and is absent from prod.

**Anyone (no Railway access):**
- The backend you hit is whatever **your** `frontend/.env` `EXPO_PUBLIC_API_URL` is set to — you control it, so confirm it there.
- Live proof: the Metro / dev-client console and a network inspector show the actual request URLs as you use the app.
- Build-type difference: a standalone **preview** APK bakes the URL from `eas.json`; a **development** build (dev client) reads
`EXPO_PUBLIC_API_URL` from local `frontend/.env` at runtime via Metro — so check your `.env`, not `eas.json`.

## Config: shared vs isolated

| Variable | Scope | Why |
|---|---|---|
| Firebase keys, LLM keys, OpenWeather key | **Shared** across all envs | External services; same account everywhere is fine |
| `DATABASE_URL` | **Isolated** per env | Data isolation — staging holds a branched copy, prod is untouchable |
| `NOTIF_API_KEY` | **Isolated** per env (2 managed: staging + prod) | A staging-key leak must be useless against prod. Local reuses the staging value. |

## Deployment flow

### Current (manual — until auto-deploy is wired)
1. **Author** develops locally (local backend → shared dev/staging DB) and **demos on a physical device in the PR** (required by CLAUDE.md). Their job, not the reviewer's.
2. **Reviewer** approves and merges the PR into `dev`.
3. **Reviewer** deploys `dev` to staging by hand:
   ```
   git checkout dev && git pull        # railway up ships the WORKING TREE, so sync dev first
   cd backend && railway up --environment staging
   ```
4. **Smoke-test staging** via the deployed app (needs no Railway access — author or reviewer can do it).
5. Once staging is confirmed working, open a `dev → main` PR. Deploy prod the same manual way (`git checkout main && git pull`, then `railway up --environment production`).

### Target (future — the deploy-automation epic)
- Staging git-connected to `dev` (auto-deploy on merge); prod git-connected to `main` (auto-deploy on merge).
- **Prerequisite:** reconcile `main` to equal `dev` before arming `main → prod`, or the first auto-deploy ships stale/huge diff to users.

## Data tiers

### Now — 2-tier
- **Dev/Staging DB:** a single shared Neon branch (copy of prod's schema). Used by BOTH every dev's local backend AND the deployed staging environment. Shared among all devs.
- **Prod DB:** separate Neon branch, used ONLY by the production deployment.
- Known cost: all local backends + staging share one DB, so devs can collide and leave test data in "staging." Accepted for now.

### Later — 3-tier
- **Per-dev branches** (each dev gets their own Neon branch for local work) + **staging** branch + **prod**.
- Evolve trigger: when shared-DB collisions start hurting (devs stepping on each other's data, schema drift).