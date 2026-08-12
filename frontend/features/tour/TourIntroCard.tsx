import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";

import { colors } from "../../utils/theme";

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Step 0. Deliberately a plain Modal rather than a tour step:
 *
 * 1. A step with no `AttachStep` renders an invisible tooltip over an undimmed
 *    screen, so a "frame the whole map" step is not expressible as one.
 * 2. It buys consent. A tour that starts unannounced right after a two-step
 *    form wizard reads as more onboarding; one the user opted into gets read.
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
              name="map-search-outline"
              size={28}
              color={colors.brandCyan}
            />
          </View>

          <Text className="font-poppins-semibold text-xl text-white text-center mb-2">
            Tu zona en tiempo real
          </Text>
          <Text className="font-poppins text-sm text-white text-center leading-5">
            Aquí verás los huracanes activos y los reportes de tu comunidad. Te
            mostramos lo importante en 4 pasos rápidos.
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
