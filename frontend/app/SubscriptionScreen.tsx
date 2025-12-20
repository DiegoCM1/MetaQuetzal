// SubscriptionScreen.tsx
import "../global.css";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function SubscriptionScreen() {
  const { colorScheme } = useTheme();

  /* ──────────────── color palette ──────────────── */
  const iconColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "rgb(50, 180, 200)";
  const textColor = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#111827";
  const subtextColor = colorScheme === "dark" ? "#9CA3AF" : "#6B7280";

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["left", "right", "bottom"]}
    >
      {/* Header Section */}
      <View className="px-6 py-8 items-center border-b border-gray-200 dark:border-neutral-700">
        <Ionicons name="people" size={64} color={iconColor} />
        <Text className="text-2xl font-bold mt-4" style={{ color: textColor }}>
          Plan Familiar
        </Text>
        <Text className="text-base text-center mt-2" style={{ color: subtextColor }}>
          Protege a toda tu familia con alertas coordinadas
        </Text>
      </View>

      {/* Coming Soon Content */}
      <View className="flex-1 px-6 py-8 items-center justify-center">
        <Ionicons name="construct-outline" size={48} color={subtextColor} />
        <Text className="text-xl font-semibold mt-4" style={{ color: textColor }}>
          Próximamente
        </Text>
        <Text className="text-base text-center mt-2 px-4" style={{ color: subtextColor }}>
          Estamos trabajando en las suscripciones familiares para que puedas compartir alertas y coordinar planes de emergencia con tus seres queridos.
        </Text>
      </View>

      {/* Features Preview */}
      <View className="px-6 pb-6">
        <Text className="text-lg font-semibold mb-4" style={{ color: textColor }}>
          Características próximas:
        </Text>

        {[
          { icon: "people-outline", text: "Comparte alertas con hasta 5 miembros" },
          { icon: "location-outline", text: "Ubicación en tiempo real de tu familia" },
          { icon: "notifications-outline", text: "Notificaciones coordinadas" },
          { icon: "shield-checkmark-outline", text: "Plan de emergencia familiar" },
        ].map((feature, index) => (
          <View
            key={index}
            className="flex-row items-center mb-3 px-4 py-3 bg-gray-50 dark:bg-neutral-800 rounded-lg"
          >
            <Ionicons name={feature.icon as any} size={24} color={iconColor} />
            <Text className="ml-4 text-base flex-1" style={{ color: textColor }}>
              {feature.text}
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}
