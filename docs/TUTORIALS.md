# In-App Tutorials — Plan & Decisions

> Status: **planned, not implemented**. Last updated 2026-08-09.
> **v1 is passive only.** The interactive map-event step is designed but deliberately deferred —
> see [DEFERRED](#deferred--interactive-map-event-step).

## Purpose

The onboarding wizard (`app/onboarding/`) **extracts** data from the user. It never explains
anything back. Tutorials are the opposite direction: short coach-mark tours that say *what a
feature is and why it matters*.

Why this app needs them more than most: **Bluai's highest-value features are invisible and used
rarely, under stress.** Nothing on screen tells a user that the IA tab runs on-device with zero
signal, what a SIAT level means, or that SOS contacts must be set up *before* a hurricane. That
learning has to happen in calm weather or it never happens.

## Scope

### Tutorial 1 — MapScreen (first landing after onboarding) — **v1, passive**
Intro card + 3 spotlight steps. Full plan in [Tutorial 1 — step plan](#tutorial-1--step-plan).

### Tutorial 2 — MoreScreen (first entry, 2 steps)
1. **Chat offline** — works with no internet, peer-to-peer
2. **Contactos SOS** — how people find you in an emergency

Build order: **Tutorial 1 + shared `features/tour/` scaffolding first**, Tutorial 2 as a small
follow-up. Keeps both under the 400-line PR limit.

## Decisions

| Decision | Rationale |
|---|---|
| **v1 is passive; interactive step deferred** | ~65% of total implementation cost came from the tutorial writing a real map event (cache filter, delete/edit/create guards, location gate, pause state machine). Passive touches zero app state and needs no spike. Ship it, then use Mixpanel to decide whether reporting needs a lesson at all. |
| **Library: `react-native-spotlight-tour`** | Peer deps all satisfied; **JS-only, no native rebuild**. No Reanimated dependency — avoids the Reanimated 4 / new-arch risk. 36k downloads/mo, v4.0.0 Jun 2025. Alternatives surveyed and rejected: `@wrack/react-native-tour-guide` (v1.0.1, too new for a life-safety app), `react-native-coachmark` (stale), `react-native-product-tour` (abandoned), Pendo/Appcues SaaS (native dep + phones home, wrong for an offline-first emergency app). |
| **Split by screen, not one tour** | Just-in-time retention; self-repairing if one is skipped. |
| **Feedback step CUT from Tutorial 2** | Self-evident from its label+icon, and it's a *you-help-us* ask sitting next to two life-safety messages. Ask for feedback *after* delivered value instead. |
| **Gate Tutorial 2 on Tutorial 1 being done/dismissed** | Prevents a fast explorer from getting both stacked. |
| **Anchor steps by named constant, never a raw index** | `AttachStep index={n}` is positional. Named constants are what make the deferred interactive steps *additive* — inserting steps mid-array shifts every later index, and with raw numbers that breaks silently across two files. |
| **Replay entry in Ajustes** | An emergency app gets opened once every six months. Non-negotiable. |
| **Mixpanel on start / each step / skip** | Already wired. Without drop-off data we can't tell a good tour from a skipped one — and it's what decides whether the interactive step ever gets built. |
| **Reuse the `onboardingService.ts` pattern for gating** | Same AsyncStorage shape, one key per tutorial. No new infra. |
| **SOS comes early** | Most safety-critical content, zero friction, and it hands off to Tutorial 2. |
| **Tab bar = one step, not one per tab** | Mapa / Alertas / Más are self-evident from their labels. Only IA has a hidden property worth words. |
| **Own intro card, not a spotlight-less first step** | A step with no `AttachStep` renders an *invisible* bubble (see Verified findings). Our own card also buys a "Ver tutorial / Ahora no" consent affordance. |

## Tutorial 1 — step plan

### What's actually on MapScreen

```
                    [layers]  ← top right
   ┌──────────────────────────────────────┐
   │   ZoneMarkers (community reports)    │
   │   HurricaneMarkers (active cyclones) │
   │                          [cyclones⁴] │  bottom 168
   │                          [+ event]   │  bottom 112
   │  [SOS ⚠]                 [recenter]  │  bottom 56
   └──────────────────────────────────────┘
        [ Mapa  IA  Alertas  Más ]
```

**Deliberately not covered:** recenter and layers (discoverable, not safety-critical).

### v1 steps

| # | Mechanism | Target | Content (ES) |
|---|---|---|---|
| 0 | **Own intro card**, before `start()` | — | "Tu zona en tiempo real: ciclones activos y reportes de tu comunidad." + `Ver tutorial` / `Ahora no` |
| 1 | `AttachStep`, circle | SOS FAB `index.tsx:901` | Avisa a tus contactos con tu ubicación. **No lo presiones ahora.** ⚠️ Aún no tienes contactos — configúralos en **Más → Contactos SOS**. |
| 2 | `AttachStep fill`, rectangle | `CustomTabBar` root, `(tabs)/_layout.tsx:42` | **La IA funciona sin internet, en tu teléfono.** |
| 3 | `AttachStep` | `+ event` FAB `index.tsx:831` | Aquí reportas lo que ves — inundaciones, bloqueos, peligros — para tu comunidad. |

**Optional 4th — the cyclones button** (`bottom 168`). Genuinely non-obvious: the comment at
`index.tsx:870` notes real cyclones "suelen estar muy mar adentro, fuera del zoom por default," so
a user can have an active hurricane and never see it. First thing to cut if the tour feels long.

### Why step 1 must mention the badge

The SOS FAB renders a badge from `linkedContactCount` (`index.tsx:919-938`). When it's `0` the badge
is **orange with a `!`** — and every user who just finished onboarding has zero contacts. A brand-new
user's first view is a red button wearing a warning marker. Explaining the button while ignoring the
`!` leaves the alarming part unexplained, and wastes the natural hand-off to Tutorial 2.

## Verified technical findings

Confirmed by reading `react-native-spotlight-tour@4.0.0`'s published source and this repo. Trust
these over intuition — several contradict what the library's docs imply.

| Finding | Consequence |
|---|---|
| **The overlay is an RN `<Modal>` + full-screen `<Svg>`. The spotlight hole is a visual mask with ZERO touch pass-through.** | Nothing behind a bubble is tappable. Any interactive step *must* `pause()` first. This is the design, not a bug — it keeps the tour a modal state machine so the UI can't desync from the step index. |
| `pause()` sets `current = undefined`, flipping the overlay Modal's `visible` to false | Clean teardown, not a dodge. But **while paused there is no tour UI at all** — no "Saltar", no progress. Any paused flow needs its own escape affordance. |
| `resume()` returns to the **same** step (`goTo(pausedAt)`) | To advance after a user action, call `goTo(index+1)`, not `resume()`. |
| A step with no `AttachStep` renders an **invisible** bubble | `spot` starts at zero-size and only `AttachStep` changes it; the tooltip only fades in when size > 0. Also: `spot` is **sticky** — a later step without `AttachStep` silently keeps the previous spotlight. |
| **Library is JS-only** — no `android/`/`ios/` dirs in the tarball | `npm i` + `npx expo start -c` is enough. No `expo run:*` rebuild. `newArchEnabled` is irrelevant — nothing to autolink. |
| `@react-navigation/bottom-tabs` renders the `tabBar` prop inside its own JSX | **Wrap `<Tabs>` in `(tabs)/_layout.tsx:103`.** That single placement puts both `CustomTabBar` and every tab screen (incl. the map) inside the context. |
| `AttachStep` injects a wrapper `<View style={{alignSelf: fill ? 'stretch' : 'flex-start'}}>` | **Tab bar needs `fill`** or it collapses to content width. |
| **The map FABs are `position:'absolute'`** (`:831`, `:853`, `:872`, `:901`) | Wrapping one puts a non-positioned wrapper around it, so `measureInWindow` returns the *wrapper's* box (≈zero, wrong place). **Move the absolute positioning onto `AttachStep`'s `style` prop and strip it from the child.** |
| `AttachStep` `cloneElement`s and measures its own wrapper — it never forwards a ref | The earlier `OptionCard` / `forwardRef` concern was over-stated. Not an issue. |
| `nativeDriver` defaults to `true`; shapes animate SVG props through `Animated` | **Unverified on Fabric + svg 15.12.1.** If the spotlight fails to draw or throws, set `nativeDriver={false}` — one prop. |
| Metro resolves the package's `"react-native": "./src/main.ts"` field | Metro bundles the lib's raw TS, and `babel.config.js`'s global `jsxImportSource: "nativewind"` applies to it. Expected fine. Escape hatch: a `resolveRequest` shim to `dist/main.js` in `metro.config.js`. |

### ⚠️ Safety bug to handle in v1

A SIAT level ≥4 push routes to `AlarmScreen` (`app/_layout.tsx:279-285`). **The tour's Modal overlay
renders above it.** A tutorial covering a hurricane alarm is a safety bug, not a polish issue.

Required, even for the passive tour:
- `stop()` in the map screen's `useFocusEffect` cleanup (blur covers the push)
- Never auto-start when `focusLat != null` or `focusSosPhone !== undefined` (deep-linked from an
  alert or SOS — `app/(tabs)/MapScreen.tsx:42-49`), or when `hasPendingSOS` is set

## File layout

`frontend/features/auth/` is flat, so keep `features/tour/` flat too.

```
frontend/features/tour/
  constants.ts        TOUR_IDS, storage keys, named step indices   ~25
  types.ts            TourId                                       ~20
  tourService.ts      mirrors onboardingService.ts exactly         ~55
  tourAnalytics.ts    await initAnalytics() + track wrappers       ~40
  TourBox.tsx         branded NativeWind tooltip (ES copy)         ~90
  TourProvider.tsx    SpotlightTourProvider + brand defaults       ~70
  useTourGate.ts      useFocusEffect auto-start + markSeen         ~70
  TourIntroCard.tsx   step-0 consent modal                         ~70
  mapTourSteps.tsx    Tutorial 1 TourStep[]                        ~110
  moreTourSteps.tsx   Tutorial 2 TourStep[]  (PR 4)                ~70
```

`TourBox.tsx` replaces the library's — its defaults are English ("Back"/"Next") and unstyled. Brand
it with `colors`/`gradients` from `utils/theme.ts` and NativeWind `className` per `frontend/CLAUDE.md`.

**Analytics contract:** `utils/analytics.js` exports `initAnalytics`, `track(event, props)`. `track()`
is a **silent no-op until `initAnalytics()` resolves** (`analytics.js:43`); the root layout fires it
at `_layout.tsx:200-202`. Careful call sites `await initAnalytics()` first — do the same.

## Build order (PRs, each ≤400 lines, each demoable on a physical device)

No frontend CI — manual QA on a physical device is the gate. iOS **and** Android both required.

**PR 1 — scaffolding + passive Tutorial 1 (~310 lines + lockfile)**
- dep add; all of `features/tour/` except `moreTourSteps`
- `(tabs)/_layout.tsx`: wrap `<Tabs>` in `<TourProvider>`; `<AttachStep fill>` around `CustomTabBar`'s root
- `app/map/index.tsx`: `AttachStep` on SOS + `+` FABs (positioning moved to the wrapper), `useTourGate`, deep-link/SOS suppression, `stop()` on blur
- **Demo:** wipe app data → onboarding → map → intro card → 3 bubbles → done; never reappears

**PR 2 — replay entry in Ajustes (~70 lines)**
- `tourService.resetAllTours()`; an `OptionCard` "Ver tutorial de nuevo" in `SettingsScreen.tsx`,
  mirroring `handleResetOnboarding` (`SettingsScreen.tsx:49-64`)

**PR 3 — Tutorial 2, MoreScreen (~160 lines)**
- Nested `SpotlightTourProvider` in `MoreScreen.tsx`; `AttachStep` keyed off `item.route`
  (the `items` array is conditional at `MoreScreen.tsx:20-30`), rectangle shape, `fill`
- Gated on Tutorial 1 done/dismissed
- Cosmetic: `OptionCard`'s `rounded-r-3xl rounded-bl-3xl rounded-tl-sm` won't be traced by a
  uniform-radius rect

---

## DEFERRED — interactive map-event step

**Not in v1.** Revisit only if Mixpanel shows users aren't discovering event reporting on their own.
Design is settled; recorded so it doesn't need re-deriving.

**Adding it later is additive.** Everything in `features/tour/` is reused; the only rewrite is step
3's `render` (passive bubble → "toca el botón" + `pause()`), ~20 lines. Named step constants absorb
the index shift.

### The risk it avoids
Map events (`Zone` on the client) are real, persisted, and visible to every user within a radius —
`map_events/service.py` filters by distance, and others can vote. POSTing one during a tutorial
**publishes a false report to nearby users**. `DELETE` exists, but the create→delete window is live
and a crash mid-tour orphans a fake event in prod.

### Design: local-only simulation
Inject a sentinel `Zone` into existing state and reuse `ZoneMarker` — same state shape, same marker,
same delete interaction, no forked rendering (a `TutorialZoneMarker` would silently teach a stale UI
the day the real marker is redesigned). `isOwner: true` gives the right detail modal for free: edit +
trash buttons at `:1093-1102`, voting hidden at `:1177`.

Distinguish it in the **description text** ("Ejemplo — solo tú puedes ver esto"), not a custom marker.

### Required edits

| File | Location | Change |
|---|---|---|
| `app/map/config.ts` | new export | `TUTORIAL_ZONE_ID` |
| `app/map/service.ts` | **`saveCachedZones` :166-168** | filter out the sentinel before writing |
| `app/map/index.tsx` | `handleSaveZone` :493-531 | sentinel id when armed; `return` before the geocode/POST IIFE at :514 |
| `app/map/index.tsx` | `handleDeleteZone` :424-440 | guard **before** `deleteZone` |
| `app/map/index.tsx` | `handleSaveEdit` :393-412 | skip `updateZone` for the sentinel |
| `app/map/_hooks/useMapTour.ts` | new | arming flag, `zones` watcher, marker anchor, `goTo`/`stop`, blur cleanup |
| `features/tour/` | `onStop` | unconditional filter by sentinel id |

### ⚠️ Corrections to earlier drafts of this doc

- **The chokepoint is `saveCachedZones`, NOT `syncCachedZones`.** `loadZones` calls the private
  `saveCachedZones` directly at `service.ts:204`, bypassing `syncCachedZones` entirely. Filtering in
  `saveCachedZones` covers all five write paths (`index.tsx:402/432/458/523` + `service.ts:204`) in
  one line that no future caller can bypass.
- **The delete flow hits the network unconditionally and its failure path resurrects the pin.**
  `handleDeleteZone:429` calls `deleteZone(deleted.id)` with no guard; the `.catch` at `:435-439`
  does `setZones(prev => [...prev, deleted])` + an error toast. Without a guard the tutorial delete
  404s and **the phantom pin comes back wearing an error message.**
- `handleSaveEdit` has the same shape (`updateZone` unconditional at `:399`, rollback at `:406-411`).

### Preconditions that make the *create* half fragile
`handleMapPress` bails when `userLocation` is null (`:367-373`) and when the tap is >10 km away
(`:374-380`); `handleSaveZone` repeats both (`:482-491`). **The create half is impossible without
location permission** and fails semi-silently if the user taps far away, leaving the tour paused
forever.

**Preferred variant if this is ever built:** inject the sentinel via the step's `before` hook +
`animateToRegion`, rather than having the user create it. One pause instead of two, no dependency on
`handleMapPress`, and the location/10 km preconditions disappear. The *delete* is the safety-critical
lesson anyway — creating is the part users rediscover on their own.

### Cleanup paths (all required)
| Path | Trigger | Covers |
|---|---|---|
| User deletes it | Happy path | The lesson itself |
| Tour stops | `onStop` | Fires on skip **and** completion |
| App killed | Free (in-memory only) | Self-healing |
| Screen blur | `useFocusEffect` cleanup | Abandonment mid-pause — otherwise the arming flag stays set and a later *real* report could be created with the sentinel id and silently dropped from cache |

### Other seams to watch
- The `loadZones` effect at `:343-358` does `setZones(valid)` when `userLocation` changes — would wipe the pin
- The "Eventos" layer toggle (`showEvents`, `:721`) can hide it
- `ZoneMarker` is a `react-native-maps` `<Marker>` and can't be wrapped by `AttachStep`. Spotlight it
  with an invisible absolutely-positioned anchor at `mapRef.current.pointForCoordinate(coord)`
  (verified present, both platforms: `react-native-maps/dist/src/MapView.d.ts:693`)
- `changeSpot` is **not** in the library's public API — `SpotlightTourContext` isn't exported

---

## Known gotchas

- **`useFocusEffect`, not `useEffect`** — tab screens stay mounted, so a mount-based trigger fires
  once per app launch and never again on return.
- **`MoreScreen` is a `ScrollView`** — needs `sameScrollView` if content ever scrolls.
- **Map events are `Zone`s on the client** — state at `app/map/index.tsx:146`, service functions in
  `app/map/service.ts`.
- **Keep `steps` a module-level constant** so the provider's `useCallback`s stay stable; the provider
  wraps `<Tabs>`, so each spot change re-renders the navigator (~4 per tour — acceptable).
- Package manager is **npm** (no `pnpm-lock.yaml` present). `.npmrc` has `legacy-peer-deps=true`.

## Out of scope

Cross-screen tours that navigate between steps. Each step would need to navigate, wait for mount,
then re-measure — targets that haven't laid out spotlight `(0,0)`. Keep each tutorial on one screen.
