  Phase 1 — Stand up the staging environment (do now, no Neon string needed)
  
  Step 1.1 — 
   Standup staging environment on railway ✅
   pointig to blank DB url. ✅
   Grab staging backend url ✅ https://backend-blueye-staging.up.railway.app

  Step 1.2 — Give staging its own internal API_KEY + Saving it ✅

  Everything else (Firebase key, LLM/notif keys) is shared — leave the forked copies as-is. Only DATABASE_URL
  and API_KEY get overridden.

  ---
  Phase 2 — Wire the DB (blocked on the Neon string)
  
  Step 2.1 — When the staging branch string arrives (DM), set DATABASE_URL on the staging env only.
  Step 2.2 — Deploy backend to staging. ensure_core_tables() runs at boot — harmless no-op since the branch
  already has prod's schema.
  Step 2.3 — Smoke test: hit one staging endpoint, confirm it's talking to the branch, not prod. (Create a
  throwaway row, check it's not in prod.)

  ---
  Phase 3 — Point the client at staging (needs only the URL from 1.3, not the DB)
  
  Step 3.1 — In eas.json, change development + preview → EXPO_PUBLIC_API_URL = staging URL. production stays on
  prod.
  Step 3.2 — Build a staging dev client, confirm the app hits staging.

  ---
  Phase 4 — Document (last, brief)

  Write docs/specs_june05/staging.md: the URLs, how to point a build, how a dev registers their device against
  staging, and the prod-DB footgun warning. This is what makes it Edgar's to use.

  ---
  The single immediate action

  Step 1.1 + 1.3: fork the staging environment off production, immediately neutralize its DATABASE_URL, and grab
  the staging URL. That's productive work that doesn't wait on your teammate, and it hands you the URL to start
  Phase 3.



## Deployment flow
- Local -> Staging (Railway) -> Prod (Railway)
    - There are 2 DBs, one for DEVELOPMENT and one for PRODUCTION. The DEVELOPMENT DB is used in Local and Staging deployments, shared amongst all devs. PRODUCTION DB is only used by PRODUCTION deployment. 
- The things shared between these 3 phases are the code, and external config.

## Data tiers