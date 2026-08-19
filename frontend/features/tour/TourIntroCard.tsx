import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

import { colors } from "../../utils/theme";

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The consent gate, shown before the tour starts. Deliberately a plain Modal
 * rather than a tour step: it buys consent, and a tour that starts unannounced
 * right after a two-step form wizard reads as more onboarding, while one the
 * user opted into gets read.
 *
 * It used to also carry the map explanation, because "frame the whole map" was
 * not expressible as a step. That is no longer true — `TourAnchor`'s `center`
 * variant frames an area without needing a control to attach to — so the map
 * content now lives in step `MAP_TOUR.MAP` with the rest of the tour, and this
 * card does one job: ask.
 */
export function TourIntroCard({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View className="flex-1 items-center justify-center px-8 bg-black/60">
        <View className="w-full rounded-2xl p-6 bg-brand-surface">
          <View
            className="self-center items-center justify-center rounded-full mb-4 bg-brand-blue/15"
            style={{ width: 56, height: 56 }}
          >
            <MaterialCommunityIcons
              name="compass-outline"
              size={28}
              color={colors.brandCyan}
            />
          </View>

          <Text className="font-poppins-semibold text-xl text-white text-center mb-2">
            Conoce tu app
          </Text>
          <Text className="font-poppins text-sm text-white text-center leading-5">
            En 5 pasos rápidos te mostramos dónde ver las alertas, cómo pedir
            ayuda y cómo reportar lo que ves.
          </Text>

          <Pressable
            onPress={onAccept}
            className="rounded-full py-3 mt-6 items-center bg-brand-blue active:opacity-80"
            accessibilityRole="button"
            accessibilityLabel="Ver tutorial"
          >
            <Text className="font-poppins-semibold text-white">
              Ver tutorial
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            className="py-3 mt-1 items-center"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Omitir el tutorial"
          >
            <Text className="font-poppins text-sm text-white/70">Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
