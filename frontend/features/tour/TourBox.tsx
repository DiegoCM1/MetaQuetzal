import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import type { RenderProps } from "react-native-spotlight-tour";

import { colors } from "../../utils/theme";

interface Props extends RenderProps {
  title: string;
  body: string;
  /** Extra emphasis line — used for the SOS "no tienes contactos" warning. */
  warning?: string;
  total: number;
}

/**
 * Branded replacement for the library's own `TourBox`, whose defaults are
 * English and unstyled. Kept as a single component so copy changes never touch
 * layout: `mapTourSteps` / `moreTourSteps` pass strings, this owns the looks.
 *
 * Styled with `className` against the tailwind tokens rather than imperative
 * values out of `theme.ts` — `className` is the system (`docs/BRAND.md`).
 *
 * **Body copy is full-opacity white on purpose.** The brand sheet's type scale
 * puts body at plain white, and its overview puts "legibility under stress"
 * ahead of decoration — this is an app people open during a hurricane. Only
 * genuinely secondary chrome (the skip link, the inactive dots) recedes, and
 * it recedes to the same 70% the rest of the app uses.
 */
export function TourBox({
  title,
  body,
  warning,
  total,
  current,
  isLast,
  next,
  stop,
}: Props) {
  const { width } = useWindowDimensions();

  // Cap against the actual screen, never a bare constant. A fixed 320 is wider
  // than the usable area on a 320pt device (iPhone SE), and wider than the gap
  // beside an edge-anchored FAB on any phone — and when the bubble cannot fit,
  // floating-ui's `shift` has nowhere to move it, so it simply renders off the
  // edge with no warning. The cap is what keeps that from being screen-size
  // roulette.
  const maxWidth = Math.min(320, width - 32);

  return (
    <View className="rounded-2xl p-4 bg-brand-surface" style={{ maxWidth }}>
      <Text className="font-poppins-semibold text-lg text-white mb-2">
        {title}
      </Text>
      <Text className="font-poppins text-sm text-white leading-5">{body}</Text>

      {warning ? (
        // Severity rides on the icon and the tint, not on the text colour.
        // `brand-orange` type at `text-xs` on a dark surface clears WCAG AA on
        // paper (~5.7:1) and is still hard to read in practice — saturated
        // orange loses too much at small sizes. White body text keeps the
        // sheet's legibility rule; the solid 16px icon carries the warning
        // colour at a size where it actually reads.
        <View className="flex-row items-start mt-4 rounded-lg px-3 py-2 bg-brand-orange/20">
          <MaterialCommunityIcons
            name="alert"
            size={16}
            color={colors.brandOrange}
            style={{ marginTop: 2 }}
          />
          <Text className="flex-1 ml-2 font-poppins text-sm leading-5 text-white">
            {warning}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-4">
        {/* Dots double as the progress indicator and set the expectation of
            how much is left — the single cheapest defence against drop-off.
            Cyan, not blue: `brand-blue` is reserved for "this is the thing you
            tap", and these are not tappable. */}
        <View className="flex-row items-center">
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              className={`rounded-full mr-1.5 ${
                i === current ? "bg-brand-cyan" : "bg-white/25"
              }`}
              style={{ width: i === current ? 18 : 6, height: 6 }}
            />
          ))}
        </View>

        <View className="flex-row items-center">
          {!isLast && (
            <Pressable
              onPress={stop}
              hitSlop={8}
              className="mr-4"
              accessibilityRole="button"
              accessibilityLabel="Saltar el tutorial"
            >
              <Text className="font-poppins text-sm text-white/70">Saltar</Text>
            </Pressable>
          )}
          <Pressable
            onPress={isLast ? stop : next}
            hitSlop={8}
            className="rounded-full px-4 py-2 bg-brand-blue active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel={
              isLast ? "Terminar el tutorial" : "Siguiente paso"
            }
          >
            <Text className="font-poppins-semibold text-sm text-white">
              {isLast ? "Entendido" : "Siguiente"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
