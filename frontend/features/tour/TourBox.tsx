import { Pressable, Text, View } from "react-native";
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
  return (
    <View
      className="rounded-2xl p-5 mx-4"
      style={{ backgroundColor: colors.brandSurface, maxWidth: 320 }}
    >
      <Text className="font-poppins-semibold text-lg text-white mb-2">
        {title}
      </Text>
      <Text className="font-poppins text-sm text-white/75 leading-5">
        {body}
      </Text>

      {warning ? (
        <View
          className="flex-row items-start mt-3 rounded-xl px-3 py-2"
          style={{ backgroundColor: "rgba(255,133,0,0.15)" }}
        >
          <Text
            className="font-poppins text-xs leading-4"
            style={{ color: colors.brandOrange }}
          >
            {warning}
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between mt-5">
        {/* Dots double as the progress indicator and set the expectation of
            how much is left — the single cheapest defence against drop-off. */}
        <View className="flex-row items-center">
          {Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              className="rounded-full mr-1.5"
              style={{
                width: i === current ? 18 : 6,
                height: 6,
                backgroundColor:
                  i === current ? colors.brandCyan : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </View>

        <View className="flex-row items-center">
          {!isLast && (
            <Pressable onPress={stop} hitSlop={8} className="mr-4">
              <Text className="font-poppins text-sm text-white/50">Saltar</Text>
            </Pressable>
          )}
          <Pressable
            onPress={isLast ? stop : next}
            hitSlop={8}
            className="rounded-full px-5 py-2 active:opacity-80"
            style={{ backgroundColor: colors.brandBlue }}
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
