# Frontend Architecture

## Stack
- Expo Router v3 (file-based routing)
- NativeWind (Tailwind for React Native)
- TypeScript (target — not fully enforced yet)
- Firebase Auth, SWR, FlashList, react-native-maps

---

## Routing Model

Expo Router uses the `app/` directory as the router. Every file in `app/` that exports a default React component becomes a route. Files and folders prefixed with `_` are private — Expo Router ignores them as routes.

**Groups** (folders wrapped in parentheses like `(auth)`, `(tabs)`) group routes without adding a URL segment.

---

## Target Structure

```
app/
  _layout.tsx                  # root layout — providers, auth gate
  +not-found.tsx               # catch-all redirect

  (auth)/                      # auth group — no URL segment
    _layout.tsx
    _context/
      AuthContext.tsx
    _types/
      index.ts
    index.tsx                  # login screen

  (tabs)/                      # tab navigator — no URL segment
    _layout.tsx
    index.tsx                  # redirects to default tab

  alerts/
    _layout.tsx
    _components/
    _hooks/
    _services/
    _types/
      index.ts
    index.tsx                  # alerts list
    [id].tsx                   # alert detail
    history.tsx

  ai/
    _layout.tsx (if needed)
    _context/
      ModelContext.tsx
    _hooks/
      useChat.ts
    _services/
      AIProvider.ts
      OnlineProvider.ts
    _types/
      index.ts
    index.tsx                  # chat screen

  map/
    _services/
      redZonesService.ts
    index.tsx

  educational/
    _layout.tsx
    _components/
    _context/
    _services/
    _types/
      index.ts
    index.tsx
    [noteId].tsx

  onboarding/
    _layout.tsx
    _components/
    _context/
    _services/
    _types/
      index.ts
    step1.tsx
    step2.tsx

  subscription/
    _layout.tsx
    _components/
    _services/
    _types/
      index.ts
    index.tsx
    manage.tsx

  settings/                    # currently SettingsScreen.jsx — needs own folder
    index.tsx

  feedback/                    # currently FeedbackScreen.jsx — needs own folder
    index.tsx

utils/                         # shared, stateless utilities
  api.ts                       # authFetch, getAuthToken
  config.ts                    # API_BASE_URL
  analytics.ts
  date.ts
  pushNotifications.ts

components/                    # shared UI components used across features
  PageTitle.tsx
  ThemeProvider.tsx

context/                       # app-level contexts (not feature-specific)
  ThemeContext.tsx
  DaltonicModeContext.tsx
```

---

## Rules

### 1. File-based routing — only route files export default components
Every `.tsx` file directly in a feature folder (not prefixed with `_`) is a route. Non-route files (components, hooks, services, types) must live in `_prefixed/` subfolders.

### 2. Types go in `_types/index.ts`, never `_types.ts`
A file named `_types.ts` directly in a route directory gets picked up by Expo Router and triggers a warning. Use a `_types/` folder with `index.ts` instead — TypeScript resolves `../_types` to either form.

### 3. Services are colocated with their feature
`redZonesService` belongs in `app/map/_services/`, not in root `services/`. `feedbackService` belongs in `app/feedback/_services/`. The root `services/` folder should not exist in the target state.

### 4. Shared utilities go in `utils/`
Stateless, feature-agnostic helpers. `authFetch`, `config`, `analytics`, `date`, `pushNotifications`. Nothing feature-specific goes here.

### 5. App-level contexts go in root `context/`
Theme, DaltonicMode — things that wrap the entire app. Feature-specific contexts (Auth, Model, Educational) stay colocated inside their feature's `_context/` folder.

### 6. TypeScript everywhere — no `.jsx`
All new files are `.tsx` or `.ts`. Existing `.jsx` files get converted when touched.

### 7. Tab screens are thin redirects
Files in `(tabs)/` should be thin — either a direct import of the feature screen or minimal wrapper. All logic lives in the feature folder.

---

## Current Problems (prioritized)

### Blocking / causing warnings
- `app/subscription/_types.ts` — file directly in route dir, triggers Expo Router warning → move to `_types/index.ts`

### Inconsistency (fix when touching the file)
- `app/_layout.jsx` → should be `.tsx`
- `app/SettingsScreen.jsx`, `app/FeedbackScreen.jsx`, `app/AlarmScreen.jsx` — flat in `app/`, PascalCase filenames, `.jsx` — move to own feature folders when polishing
- `app/(tabs)/AlertsHistoryScreen.jsx`, `ChatAIScreen.jsx`, `MoreScreen.jsx` — `.jsx`, PascalCase routes
- `services/feedbackService.ts`, `services/redZonesService.js` — root services folder, should be colocated
- `context/` root folder exists alongside colocated `_context/` folders — consistent but worth documenting intent

### Dead files (remove)
- `api/sendMessage.jsx` — legacy, replaced by `utils/api.ts`
- `push-test/` — dev script, not app code

---

## Migration Priority

**Now (before Play Store):** Fix only what's causing warnings or blocking work.
- Move `subscription/_types.ts` → `_types/index.ts`

**Phase 7 (post launch):** Full migration
- Convert all `.jsx` → `.tsx`
- Move flat screens into feature folders
- Colocate root `services/` into features
- Remove dead files
