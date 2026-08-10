/**
 * Tour identity, persistence keys, and step indices.
 *
 * Step indices are named constants on purpose: `AttachStep index={n}` is
 * positional, so a raw number couples the JSX (spread across several screens)
 * to the position of an entry in the steps array. Inserting a step would then
 * silently re-point every later spotlight at the wrong element. Named keys make
 * that a non-event — which is what keeps the deferred interactive steps
 * (docs/TUTORIALS.md) additive rather than a rewrite.
 */

import type { TourId } from "./types";

/**
 * Master kill switch. Set to `false` to disable every tutorial app-wide
 * without reverting any code: `TourProvider` renders its children untouched,
 * and `useTourGate` never fires.
 *
 * This exists so a tour bug found after release is a one-line fix rather than
 * an unpick of edits across four screens.
 */
export const TOURS_ENABLED = true;

export const TOUR_IDS = {
  map: "map",
  more: "more",
} as const;

/** AsyncStorage keys — same `@blueye_` prefix as `onboardingService.ts`. */
export const TOUR_STORAGE_KEYS: Record<TourId, string> = {
  map: "@blueye_tour_map_seen",
  more: "@blueye_tour_more_seen",
};

/** Tutorial 1 — MapScreen. Order matches `mapTourSteps`. */
export const MAP_TOUR = {
  SOS: 0,
  TABS: 1,
  REPORT: 2,
} as const;

/** Tutorial 2 — MoreScreen. Order matches `moreTourSteps`. */
export const MORE_TOUR = {
  OFFLINE_CHAT: 0,
  SOS_CONTACTS: 1,
} as const;

/** Routes in `MoreScreen`'s `items` array that carry a spotlight. */
export const MORE_TOUR_ROUTES: Record<string, number> = {
  "/local-chat": MORE_TOUR.OFFLINE_CHAT,
  "/SOSContactsScreen": MORE_TOUR.SOS_CONTACTS,
};
