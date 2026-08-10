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
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <View
          className="w-full rounded-3xl p-6"
          style={{ backgroundColor: colors.brandSurface }}
        >
          <View
            className="self-center items-center justify-center rounded-full mb-4"
            style={{
              width: 56,
              height: 56,
              backgroundColor: "rgba(49,103,255,0.15)",
            }}
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
          <Text className="font-poppins text-sm text-white/70 text-center leading-5">
            Aquí ves los ciclones activos y los reportes de tu comunidad. Te
            mostramos lo importante en 3 pasos rápidos.
          </Text>

          <Pressable
            onPress={onAccept}
            className="rounded-full py-3 mt-6 items-center active:opacity-80"
            style={{ backgroundColor: colors.brandBlue }}
          >
            <Text className="font-poppins-semibold text-white">
              Ver tutorial
            </Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            className="py-3 mt-1 items-center"
            hitSlop={8}
          >
            <Text className="font-poppins text-sm text-white/50">Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
