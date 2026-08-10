import { initAnalytics, track } from "../../utils/analytics";

import type { TourId } from "./types";

/**
 * Mixpanel wrappers for tour funnel events.
 *
 * `track()` is a silent no-op until `initAnalytics()` has resolved
 * (`utils/analytics.js`), and the root layout fires it during startup. A tour
 * can begin before that resolves, so each call awaits init first — otherwise
 * the `started` event, the one the whole funnel is measured against, is the
 * event most likely to be dropped.
 *
 * Fire-and-forget by design: analytics must never delay or break the tour.
 */
const send = (event: string, props: Record<string, unknown>): void => {
  initAnalytics()
    .then(() => track(event, props))
    .catch(() => {});
};

export const trackTourStarted = (tour: TourId): void =>
  send("tour_started", { tour });

export const trackTourStep = (tour: TourId, step: number): void =>
  send("tour_step_viewed", { tour, step });

/**
 * `completed` distinguishes "reached the end" from "bailed", which is the
 * number that decides whether a tour is working or just being dismissed.
 */
export const trackTourFinished = (
  tour: TourId,
  completed: boolean,
  lastStep: number,
): void => send("tour_finished", { tour, completed, lastStep });

export const trackTourSkippedIntro = (tour: TourId): void =>
  send("tour_intro_declined", { tour });
