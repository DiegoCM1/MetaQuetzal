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
      <View className="flex-1 bg-phase2bg">
      {/* Renderizar pantallas */}
      <Slot />

      {/* Barra de navegación inferior */}
      <View className="w-full bg-phase2Cards border-t border-phase2Borders">
        <View className="flex-row">
          {/* Botón Inicio */}
          <Link
            href="/"
            className={`flex-1 p-4 items-center text-center ${
              currentRoute === "/"
                ? "bg-phase2Cards text-phase2Titles"
                : "bg-phase2Buttons text-white hover:bg-phase2Borders"
            }`}
          >
            <Ionicons
              name="home"
              size={28}
              color={currentRoute === "/" ? "rgb(30, 30, 60)" : "white"}
            />
          </Link>

          {/* Botón Chat-AI */}
          <Link
            href="/chat-ai"
            className={`flex-1 p-4 items-center text-center ${
              currentRoute.startsWith("/chat-ai")
                ? "bg-phase2Cards text-phase2Titles"
                : "bg-phase2Buttons text-white hover:bg-phase2Borders"
            }`}
          >
            <MaterialCommunityIcons
              name="robot-happy"
              size={28}
              color={
                currentRoute.startsWith("/chat-ai")
                  ? "rgb(30, 30, 60)"
                  : "white"
              }
            />
          </Link>

          {/* Botón Configuración */}
          <Link
            href="/settings"
            className={`flex-1 p-4 items-center text-center ${
              currentRoute.startsWith("/settings")
                ? "bg-phase2Cards text-phase2Titles"
                : "bg-phase2Buttons text-white hover:bg-phase2Borders"
            }`}
          >
            <MaterialIcons
              name="settings"
              size={28}
              color={
                currentRoute.startsWith("/settings")
                  ? "rgb(30, 30, 60)"
                  : "white"
              }
            />
          </Link>

          {/* Botón Monetización */}
          <Link
            href="/monetization"
            className={`flex-1 p-4 items-center text-center ${
              currentRoute.startsWith("/monetization")
                ? "bg-phase2Cards text-phase2Titles"
                : "bg-phase2Buttons text-white hover:bg-phase2Borders"
            }`}
          >
            <MaterialCommunityIcons
              name="account-cash"
              size={28}
              color={
                currentRoute.startsWith("/monetization")
                  ? "rgb(30, 30, 60)"
                  : "white"
              }
            />
          </Link>
        </View>
      </View>
    </View>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
