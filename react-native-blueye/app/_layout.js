import { Slot, Link, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Layout() {
  const router = useRouter(); // Hook para obtener la ruta actual
  const currentRoute = router?.pathname || ""; // Validación para evitar errores

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        <View className="flex-1 bg-gray-100">
          {/* Renderizar pantallas */}
          <Slot />
          {/* Barra de navegación inferior */}
          <View className="w-full bg-blue-500">
            <View className="flex-row border-t border-gray-300">
              {/* Botón Inicio */}
              <Link
                href="/"
                className={`flex-1 p-4 items-center text-center ${
                  currentRoute === "/"
                    ? "bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                <Ionicons name="home" size={32} color="white" />
              </Link>

              {/* Botón Chat-AI */}
              <Link
                href="/chat-ai"
                className={`flex-1 p-4 items-center text-center ${
                  currentRoute.startsWith("/chat-ai")
                    ? "bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                <MaterialCommunityIcons name="robot-happy" size={32} color="white" />
              </Link>

              {/* Botón Configuración */}
              <Link
                href="/settings"
                className={`flex-1 p-4 items-center text-center ${
                  currentRoute.startsWith("/settings")
                    ? "bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                <MaterialIcons name="settings" size={32} color="white" />
              </Link>

              {/* Botón Monetización */}
              <Link
                href="/monetization"
                className={`flex-1 p-4 items-center text-center ${
                  currentRoute.startsWith("/monetization")
                    ? "bg-blue-700 text-white"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                <MaterialCommunityIcons
                  name="account-cash"
                  size={32}
                  color="white"
                />
              </Link>
            </View>
          </View>
        </View>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
