# CLAUDE.md — frontend

This file supplements the root `CLAUDE.md` with frontend-specific guidance. Read both.

## Platform — mobile only

- **Targets: iOS + Android. Web is NOT supported.** Do not add `.web.tsx` / `.web.jsx` files or web-only dependencies. Legacy web files and deps (`leaflet`, `react-native-web`, the `web` script) still exist but are being removed — don't extend them.
- **iOS is first-class.** Every change must work on iOS, not just Android. Test on a physical iPhone (`npx expo run:ios`), not only the Android device.

## Routing — expo-router (file-based)

- Routes live in `app/`. Route groups: `(auth)`, `(tabs)`.
- **Underscore-prefixed dirs/files are NOT routes** — `_components`, `_hooks`, `_services`, `_utils`, `_types.ts` are colocated private code for the route they sit under. This is the feature-colocation pattern (see `app/alerts/`, `app/ai/`).

## Styling — NativeWind

- **NativeWind (Tailwind `className`) is the styling system.** Default to `className`. A few files use `StyleSheet.create`; that's the minority, not the pattern to follow.
- Tailwind config: `tailwind.config.js`, `global.css`. Design tokens / palette / spacing → `docs/BRAND.md`.

## Data & state

- **Backend base URL has one source of truth:** `utils/config.ts` exports `API_BASE_URL = process.env.EXPO_PUBLIC_API_URL`. Import `API_BASE_URL` — do **not** read `process.env.EXPO_PUBLIC_API_URL` directly elsewhere.
- Server data: **SWR** + **axios**.
- Auth state: `features/auth/AuthContext.tsx` (Firebase via `@react-native-firebase`). App-wide contexts (theme, daltonic mode) live in `context/`.

## AI chat

- Two providers behind `app/ai/_services/`: **on-device** (`react-native-executorch`, LLaMA) and **online** (`OnlineProvider`). The `useChat` hook (`app/ai/_hooks/`) orchestrates them. `ModelContext` has a `.web.tsx` variant — legacy, do not extend.

## Analytics & monitoring

- **Sentry** (`@sentry/react-native`) and **Mixpanel** (`mixpanel-react-native`) are wired. Config via `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_MIXPANEL_PROJECT_TOKEN` (public client config in `eas.json`).
