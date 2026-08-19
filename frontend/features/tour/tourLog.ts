/**
 * Dev-only tracing for the tutorial, prefixed `[QA_TOUR]` to match the existing
 * `[QA_MAP]` convention in `app/map/index.tsx`.
 *
 * A tour fails *silently* by design — a zero-sized anchor produces a dimmed
 * screen with no spotlight and no tooltip, and nothing throws. These logs exist
 * to make that visible, so the failure mode is "obvious in Metro" rather than
 * "stare at a grey screen".
 *
 * All calls compile away behind `__DEV__` in release builds.
 */

const PREFIX = "[QA_TOUR]";

export const tourLog = (...args: unknown[]): void => {
  if (__DEV__) console.log(PREFIX, ...args);
};

/** Use for states that mean the tutorial is broken, not merely inactive. */
export const tourWarn = (...args: unknown[]): void => {
  if (__DEV__) console.warn(PREFIX, ...args);
};
