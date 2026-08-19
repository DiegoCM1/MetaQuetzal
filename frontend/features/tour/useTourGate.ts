import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useSpotlightTour } from "react-native-spotlight-tour";

import { hasSeenTour, markTourSeen, shouldRunMoreTour } from "./tourService";
import { trackTourSkippedIntro, trackTourStarted } from "./tourAnalytics";
import { TOURS_ENABLED, TOUR_IDS } from "./constants";
import { tourLog } from "./tourLog";
import type { TourId } from "./types";

/** Let the screen settle before measuring anchors and dimming it. */
const START_DELAY_MS = 700;

interface Options {
  tourId: TourId;
  /**
   * Set false to suppress auto-start. Callers use this for states where a
   * tutorial would be wrong or unsafe — see the map screen's deep-link and
   * pending-SOS checks.
   */
  enabled?: boolean;
  /** Show the consent card first instead of starting immediately. */
  withIntro?: boolean;
}

/**
 * Decides whether a tutorial runs on this visit, and guarantees it stops when
 * the screen goes away.
 *
 * `useFocusEffect`, not `useEffect`: tab screens stay mounted once visited, so
 * a mount-based trigger fires once per app launch and never again on return —
 * which would make "first visit to Más" untestable and unreliable.
 */
export function useTourGate({
  tourId,
  enabled = true,
  withIntro = false,
}: Options) {
  const { start, stop } = useSpotlightTour();
  const [introVisible, setIntroVisible] = useState(false);
  // Guards against double-firing *within a single focus* (React re-invokes
  // effects in dev). It is deliberately reset on blur rather than kept for the
  // component's lifetime: tab screens stay mounted forever, so a permanent
  // latch would make "Ver tutorial de nuevo" in Ajustes silently do nothing.
  // The AsyncStorage flag is the real gate; this is only a re-entrancy guard.
  const handledRef = useRef(false);

  const beginTour = useCallback(() => {
    tourLog(
      `▶️  start("${tourId}") — expecting step 0's anchor to measure next`,
    );
    trackTourStarted(tourId);
    start();
  }, [start, tourId]);

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let cancelled = false;

      tourLog(
        `focus "${tourId}" | enabled:${enabled} killSwitch:${TOURS_ENABLED} alreadyHandled:${handledRef.current}`,
      );

      if (TOURS_ENABLED && enabled && !handledRef.current) {
        handledRef.current = true;

        (async () => {
          const shouldRun =
            tourId === TOUR_IDS.more
              ? await shouldRunMoreTour()
              : !(await hasSeenTour(tourId));

          if (!shouldRun) {
            tourLog(`⏭️  "${tourId}" already seen — not running`);
            return;
          }
          if (cancelled) {
            tourLog(`"${tourId}" cancelled before start (screen blurred)`);
            return;
          }

          timer = setTimeout(() => {
            // Marked when the tutorial actually reaches the screen — not when
            // it is scheduled. A crash or force-quit mid-tour still won't
            // re-trigger it (Ajustes has a replay entry for anyone who wants
            // it back), but an interruption *during* the delay above now costs
            // nothing.
            //
            // That distinction is the whole point. This effect can tear down
            // for reasons that have nothing to do with the user — a blur, an
            // `enabled` flip when a queued SOS resolves, any dependency
            // changing identity — and the cleanup clears this timer. Writing
            // the flag before the timer meant every one of those paths lost
            // the tutorial *permanently*: the re-run reads "seen" and gives
            // up. Written here, an interrupted attempt is simply offered again
            // on the next focus.
            //
            // Not awaited: `markTourSeen` swallows its own errors, and making
            // the user wait on a disk write before the first bubble appears
            // would trade a real delay for nothing.
            markTourSeen(tourId);

            if (withIntro) {
              tourLog(`showing intro card for "${tourId}"`);
              setIntroVisible(true);
            } else {
              beginTour();
            }
          }, START_DELAY_MS);
        })();
      } else if (!TOURS_ENABLED) {
        tourLog("kill switch is OFF — no tutorial will ever run");
      }

      return () => {
        tourLog(`blur "${tourId}" — stopping tour and clearing guards`);
        cancelled = true;
        handledRef.current = false;
        if (timer) clearTimeout(timer);
        setIntroVisible(false);
        // Safety, not tidiness: a SIAT level >= 4 push routes to AlarmScreen,
        // and this overlay is a native Modal that would render on top of it. A
        // tutorial must never cover a hurricane alarm.
        stop();
      };
    }, [enabled, tourId, withIntro, beginTour, stop]),
  );

  const acceptIntro = useCallback(() => {
    tourLog("intro accepted → starting tour");
    setIntroVisible(false);
    beginTour();
  }, [beginTour]);

  const declineIntro = useCallback(() => {
    tourLog("intro declined → tour will not run");
    setIntroVisible(false);
    trackTourSkippedIntro(tourId);
  }, [tourId]);

  return { introVisible, acceptIntro, declineIntro };
}
