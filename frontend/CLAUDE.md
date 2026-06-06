# CLAUDE.md — frontend

This file supplements the root `CLAUDE.md` with frontend-specific guidance. Read both.

## Platform — mobile only

- **Targets: iOS + Android. Web is NOT supported.** Do not add `.web.tsx` / `.web.jsx` files or web-only dependencies. Legacy web files and deps (`leaflet`, `react-native-web`, the `web` script) still exist but are being removed — don't extend them.
- **Write iOS-safe code.** Every change must work on iOS, not just Android — don't ship Android-only assumptions (platform-specific APIs, permission flows, styling quirks). iOS parity is required even though most of the team develops on Android.

## Routing — expo-router (file-based)

- Routes live in `app/`. Route groups: `(auth)`, `(tabs)`.
- **Underscore-prefixed dirs/files are NOT routes** — `_components`, `_hooks`, `_services`, `_utils`, `_types.ts` are colocated private code for the route they sit under. This is the feature-colocation pattern (see `app/alerts/`, `app/ai/`).

## Feature organization

`app/` is currently inconsistent (some features are folders, some are lone `*Screen.tsx` files) — **converge on this going forward.**

- **A feature is a folder; only a trivial leaf screen is a file.** A feature (its own components, hooks, data layer, types) lives in a folder with colocated underscore dirs — `_components/`, `_hooks/`, `_services/`, `_utils/`, `_types.ts` — like `app/ai/`, `app/alerts/`, `app/educational/`, `app/onboarding/`, `app/subscription/`. Only a genuinely static leaf (no data layer, no sub-components) stays a single file.
- **Route names are lowercase and `kebab-case`, with no `Screen` suffix.** In expo-router the file/folder name *is* the URL, so `app/SOSContactsScreen.tsx` becomes the route `/SOSContactsScreen`. Name a feature for its route: `app/sos-contacts/` → `/sos-contacts`. The PascalCase `*Screen.tsx` files (`AlarmScreen`, `FeedbackScreen`, `NotificationPreferencesScreen`, `SOSContactsScreen`, `SettingsScreen`) are legacy to migrate, **not** the pattern to copy.
- **Keep the data layer out of the screen** — network / SWR / cache logic goes in `_hooks` + `_services`, not inline in the component (see `app/alerts/_hooks/useAlerts.ts`).
- **New files are TypeScript** (`.tsx` / `.ts`). The remaining `.jsx` (`AlarmScreen.jsx`, `FeedbackScreen.jsx`, `index.jsx`) is legacy.
- **Apply to new work; migrate existing deliberately, not in a rush.** Renaming a route changes its URL and every `router.push(...)` / `<Link>` call site — do it as its own focused change, never folded into a feature PR.
- **Don't over-structure.** A folder wrapping a single trivial file is just noise — keep a true leaf inline until it grows a real UI/data split.

## Styling — NativeWind

- **NativeWind (Tailwind `className`) is the styling system.** Default to `className`. A few files use `StyleSheet.create`; that's the minority, not the pattern to follow.
- Tailwind config: `tailwind.config.js`, `global.css`. Design tokens / palette / spacing → `docs/BRAND.md`.

## Data & state

- **Backend base URL has one source of truth:** `utils/config.ts` exports `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL`. Import `API_BASE_URL` — do **not** read `process.env.EXPO_PUBLIC_API_URL` directly elsewhere.
- **HTTP goes through `authFetch` (`utils/api.ts`)** — plain `fetch` with a Firebase ID token attached as `Authorization: Bearer`. Use it for authenticated calls; don't hand-roll `fetch` + token elsewhere. (`axios` is in `package.json` but legacy — don't reach for it.)
- **SWR** is used for client-side caching/revalidation where a hook needs it (e.g. `app/alerts/_hooks/useAlerts.ts`) — not a blanket requirement on every call.
- Auth state: `features/auth/AuthContext.tsx` (Firebase via `@react-native-firebase`). App-wide contexts (theme, daltonic mode) live in `context/`.

## AI chat

- Two providers behind `app/ai/_services/`: **on-device** (`react-native-executorch`, LLaMA) and **online** (`OnlineProvider`). The `useChat` hook (`app/ai/_hooks/`) orchestrates them. `ModelContext` has a `.web.tsx` variant — legacy, do not extend.

## Analytics & monitoring

- **Sentry** (`@sentry/react-native`) and **Mixpanel** (`mixpanel-react-native`) are wired. Config via `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_MIXPANEL_PROJECT_TOKEN` (public client config in `eas.json`).
