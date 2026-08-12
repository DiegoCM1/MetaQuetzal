import { View } from "react-native";
import { AttachStep } from "react-native-spotlight-tour";

import { tourWarn } from "./tourLog";
import { useMeasureOffset } from "./useMeasureOffset";

interface BoxProps {
  /** Step index this anchor marks. Use a named constant, never a literal. */
  index: number;
  width: number;
  height: number;
  /** Distance from the container's bottom edge. */
  bottom: number;
  left?: number;
  right?: number;
  fill?: never;
}

interface FillProps {
  index: number;
  /** Cover the parent exactly — for targets whose size isn't known statically. */
  fill: true;
  /**
   * Trim the covered area, for when the parent is bigger than the thing worth
   * spotlighting — e.g. a wrapper whose child carries its own margins.
   */
  inset?: { top?: number; bottom?: number; left?: number; right?: number };
  width?: never;
  height?: never;
  bottom?: never;
  left?: never;
  right?: never;
}

/**
 * An invisible box the spotlight attaches to, standing in for a real control.
 *
 * Two reasons it exists rather than wrapping the control directly:
 *
 * 1. **Safety.** `AttachStep` wraps its child in a View it owns and measures,
 *    handing that control's layout to tour code. The SOS button is not
 *    something to put at the mercy of a tutorial — if this goes wrong a
 *    spotlight lands in the wrong place instead of an emergency button moving.
 * 2. **It's where the offset correction belongs.** `measureInWindow` and the
 *    overlay disagree about where y=0 is (see `useMeasureOffset`). Shifting an
 *    invisible anchor fixes the spotlight; shifting the real control would fix
 *    the spotlight by breaking the UI.
 *
 * `collapsable={false}` matters: Android flattens empty views out of the
 * hierarchy, and a flattened anchor measures 0x0 — which renders as a dimmed
 * screen with no spotlight and no tooltip, silently.
 */
export function TourAnchor(props: BoxProps | FillProps) {
  const offsetY = useMeasureOffset();

  // Positive offsetY pushes the anchor DOWN, so the under-reported measurement
  // lands back on the real target.
  const style = props.fill
    ? {
        position: "absolute" as const,
        top: offsetY + (props.inset?.top ?? 0),
        left: props.inset?.left ?? 0,
        right: props.inset?.right ?? 0,
        bottom: -offsetY + (props.inset?.bottom ?? 0),
        pointerEvents: "none" as const,
      }
    : {
        position: "absolute" as const,
        bottom: props.bottom - offsetY,
        left: props.left,
        right: props.right,
        width: props.width,
        height: props.height,
        pointerEvents: "none" as const,
      };

  return (
    <AttachStep index={props.index} style={style}>
      <View
        collapsable={false}
        style={{ width: "100%", height: "100%" }}
        onLayout={(e) => {
          if (!__DEV__) return;
          const { width, height } = e.nativeEvent.layout;
          // A zero-sized anchor is the nastiest failure this feature has: the
          // overlay dims the screen, refuses to draw a spotlight it cannot
          // locate, and keeps the tooltip at opacity 0 — so you get a grey
          // screen and no error anywhere. Name it instead.
          if (width === 0 || height === 0) {
            tourWarn(
              `anchor for step ${props.index} laid out ${width}x${height}. ` +
                `The spotlight and tooltip will NOT render — you will see a ` +
                `dimmed screen and nothing else.`,
            );
          }
        }}
      />
    </AttachStep>
  );
}
