import { useCallback, type ReactNode } from "react";
import {
  SpotlightTourProvider,
  type TourState,
  type TourStep,
} from "react-native-spotlight-tour";

import { colors } from "../../utils/theme";
import { TOURS_ENABLED } from "./constants";
import { trackTourFinished } from "./tourAnalytics";
import { tourLog } from "./tourLog";
import { MeasureOffsetProvider } from "./useMeasureOffset";
import type { TourId } from "./types";

interface Props {
  tourId: TourId;
  steps: TourStep[];
  children: ReactNode;
}

/**
 * Brand defaults for every tour, in one place.
 *
 * The overlay renders inside its own RN `<Modal>` and is invisible while idle,
 * so wrapping a whole navigator in this costs nothing when no tour is running.
 */
export function TourProvider({ tourId, steps, children }: Props) {
  // Memoized, and declared above the kill-switch return so the hook order
  // stays unconditional.
  //
  // The identity is load-bearing, not a render optimisation. The library
  // derives its `stop` from this exact callback (`useCallback(…, [onStop])`),
  // and `useTourGate` keeps `stop` in the dependency array of a
  // `useFocusEffect`. An inline arrow here hands every re-render of this
  // component a fresh `stop`, which tears that effect down and runs its
  // cleanup — calling `stop()` on a tour that is still on screen and logging a
  // `tour_finished` the user never triggered.
  const handleStop = useCallback(
    ({ index, isLast }: TourState) => {
      tourLog(`⏹️  stop "${tourId}" at step ${index} | reachedEnd:${isLast}`);
      trackTourFinished(tourId, isLast, index);
    },
    [tourId],
  );

  // Disabled: render children straight through. Any `useSpotlightTour()` below
  // then resolves to the library's default context, which is a complete no-op
  // object — so consumers keep working instead of crashing.
  if (!TOURS_ENABLED) {
    return <>{children}</>;
  }

  return (
    <MeasureOffsetProvider>
      <SpotlightTourProvider
        steps={steps}
        overlayColor={colors.brandBlack}
        overlayOpacity={0.82}
        arrow={12}
        motion="bounce"
        // Explicitly off: the shapes animate SVG props through `Animated`, and
        // native-driven SVG attributes are not something we've verified on
        // Fabric + react-native-svg 15. Three steps of spotlight movement is not
        // a performance problem worth the risk.
        nativeDriver={false}
        // Tapping the dimmed area advances rather than dismissing. Backdrop taps
        // are usually a miss, and silently killing the tutorial on a miss is
        // worse than moving on.
        onBackdropPress="continue"
        onStop={handleStop}
      >
        {children}
      </SpotlightTourProvider>
    </MeasureOffsetProvider>
  );
}
