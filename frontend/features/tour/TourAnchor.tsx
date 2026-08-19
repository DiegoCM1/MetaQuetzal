import { View } from "react-native";
import type { ViewStyle } from "react-native";
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
  center?: never;
  size?: never;
}

interface CenterProps {
  index: number;
  /**
   * A fixed-size box centred in the parent — for framing an area rather than a
   * control, e.g. "your zone" on the map.
   *
   * Centred with `top/left: "50%"` plus a translate, deliberately: the parent
   * here is a `flex:1` View, so its height is the screen minus the tab bar and
   * insets, and nothing on this side knows that number. Symmetric insets
   * computed from `useWindowDimensions` would overshoot and can resolve to a
   * negative height — which is the 0x0 anchor this file warns about below.
   * Percentages are resolved against the real parent, so no one has to know it.
   */
  center: true;
  /** Diameter of the framed area, in points. */
  size: number;
  fill?: never;
  inset?: never;
  width?: never;
  height?: never;
  bottom?: never;
  left?: never;
  right?: never;
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
  center?: never;
  size?: never;
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
export function TourAnchor(props: BoxProps | FillProps | CenterProps) {
  const offsetY = useMeasureOffset();

  // Positive offsetY pushes the anchor DOWN, so the under-reported measurement
  // lands back on the real target.
  // if/else rather than a ternary chain: nested ternaries over a three-way
  // union stop narrowing the discriminant, and the branches then read as
  // `never`. This also lets the result be one declared ViewStyle instead of a
  // union of three object literals.
  let style: ViewStyle;
  if ("center" in props && props.center) {
    style = {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: props.size,
      height: props.size,
      // Half the box back on each axis to land its centre on the parent's,
      // plus the same measurement correction the other variants apply.
      transform: [
        { translateX: -props.size / 2 },
        { translateY: -props.size / 2 + offsetY },
      ],
      pointerEvents: "none",
    };
  } else if ("fill" in props && props.fill) {
    style = {
      position: "absolute",
      top: offsetY + (props.inset?.top ?? 0),
      left: props.inset?.left ?? 0,
      right: props.inset?.right ?? 0,
      bottom: -offsetY + (props.inset?.bottom ?? 0),
      pointerEvents: "none",
    };
  } else {
    const box = props as BoxProps;
    style = {
      position: "absolute",
      bottom: box.bottom - offsetY,
      left: box.left,
      right: box.right,
      width: box.width,
      height: box.height,
      pointerEvents: "none",
    };
  }

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
