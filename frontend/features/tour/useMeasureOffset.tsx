import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { View } from "react-native";

import { tourLog } from "./tourLog";

/**
 * Corrects a mismatch between the coordinate space `measureInWindow` reports in
 * and the one the tour overlay draws in.
 *
 * On an edge-to-edge Android app, views lay out from the true top of the screen,
 * but `measureInWindow` returns y measured from *below* the status bar. The
 * overlay draws the spotlight at the number it is handed, so every hole lands
 * one status-bar-height too high.
 *
 * Rather than hardcode a status bar height — which varies with notches,
 * punch-holes and platform, and is the constant that makes a tutorial "work on
 * my phone" — the difference is measured at runtime.
 *
 * **This is deliberately global, not per-container.** The offset is a property
 * of the window, so it must be measured by a view known to sit at the screen's
 * origin. A container that starts lower (the tab bar, say) would measure its own
 * position instead and produce nonsense. `TourProvider` owns the one probe; every
 * anchor reads the result from context.
 */
const MeasureOffsetContext = createContext(0);

export const useMeasureOffset = () => useContext(MeasureOffsetContext);

export function MeasureOffsetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [offsetY, setOffsetY] = useState(0);
  const ref = useRef<View>(null);

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((_x, y) => {
      // Pinned at the screen's origin by construction, so whatever
      // measureInWindow reports IS the delta between the two spaces.
      const next = -y;
      setOffsetY((prev) => {
        if (Math.abs(prev - next) < 0.5) return prev;
        tourLog(
          `📏 measurement offset calibrated: ${next.toFixed(1)}px ` +
            `(measureInWindow said y=${y.toFixed(1)} for a view at screen y=0)`,
        );
        return next;
      });
    });
  }, []);

  return (
    <MeasureOffsetContext.Provider value={offsetY}>
      <View style={{ flex: 1 }}>
        <View
          ref={ref}
          collapsable={false}
          onLayout={onLayout}
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, width: 1, height: 1 }}
        />
        {children}
      </View>
    </MeasureOffsetContext.Provider>
  );
}
