import { Slot, Link, useRouter } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ThemeProvider } from "../context/ThemeContext"; // Importa tu ThemeProvider

export default function Layout() {
  const router = useRouter(); // Hook para obtener la ruta actual
  const currentRoute = router?.pathname || ""; // Validación para evitar errores

  const { colorScheme } = useColorScheme();

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme="light">
          {/* Fondo de toda la app */}
          <View className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
            {/* Renderizar pantallas */}
            <Slot />

            {/* Barra de navegación inferior */}
            <View className="w-full bg-phase2Cards dark:bg-phase2CardsDark border-t border-phase2Borders dark:border-phase2BordersDark">
              <View className="flex-row">
                {/* Botón Inicio */}
                <Link
                  href="/"
                  className={`flex-1 p-4 items-center text-center ${
                    currentRoute === "/"
                      ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                      : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                  }`}
                >
                  <Ionicons
                    name="home"
                    size={28}
                    color={
                      currentRoute === "/"
                        ? colorScheme === "dark"
                          ? "rgb(230, 230, 250)" // phase2TitlesDark
                          : "rgb(30, 30, 60)" // phase2Titles
                        : "white"
                    }
                  />
                </Link>

                {/* Botón Chat-AI */}
                <Link
                  href="/chat-ai"
                  className={`flex-1 p-4 items-center text-center ${
                    currentRoute.startsWith("/chat-ai")
                      ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                      : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="robot-happy"
                    size={28}
                    color={
                      currentRoute.startsWith("/chat-ai")
                        ? colorScheme === "dark"
                          ? "rgb(230, 230, 250)" // phase2TitlesDark
                          : "rgb(30, 30, 60)" // phase2Titles
                        : "white"
                    }
                  />
                </Link>

                {/* Botón Configuración */}
                <Link
                  href="/settings"
                  className={`flex-1 p-4 items-center text-center ${
                    currentRoute.startsWith("/settings")
                      ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                      : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                  }`}
                >
                  <MaterialIcons
                    name="settings"
                    size={28}
                    color={
                      currentRoute.startsWith("/settings")
                        ? colorScheme === "dark"
                          ? "rgb(230, 230, 250)" // phase2TitlesDark
                          : "rgb(30, 30, 60)" // phase2Titles
                        : "white"
                    }
                  />
                </Link>

                {/* Botón Monetización */}
                <Link
                  href="/monetization"
                  className={`flex-1 p-4 items-center text-center ${
                    currentRoute.startsWith("/monetization")
                      ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                      : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="account-cash"
                    size={28}
                    color={
                      currentRoute.startsWith("/monetization")
                        ? colorScheme === "dark"
                          ? "rgb(230, 230, 250)" // phase2TitlesDark
                          : "rgb(30, 30, 60)" // phase2Titles
                        : "white"
                    }
                  />
                </Link>
              </View>
            </View>
          </View>
        </TamaguiProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
