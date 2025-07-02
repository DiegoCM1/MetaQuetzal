import { Slot, Link, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ThemeProvider } from "../context/ThemeContext"; // Importa tu ThemeProvider
import { DaltonicModeProvider } from "../context/DaltonicModeContext";

export default function Layout() {
  const router = useRouter(); // Hook para obtener la ruta actual
  const currentRoute = router?.pathname || ""; // Validación para evitar errores

  const { colorScheme } = useColorScheme();

  return (
    <DaltonicModeProvider>
      {" "}
      {/* Envolvemos todo el layout */}
      <ThemeProvider>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme="light">
            {/* Fondo de toda la app */}
            <View className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
              {/* Renderizar pantallas */}
              <Slot />
              {/* Top Bar */}
              <View className="flex-row items-center fixed p-2 bg-phase2TopBar dark:bg-phase2TopBarDark border border-red-700 dark:border-phase2BordersDark w-full z-10">
                <MaterialCommunityIcons
                  name="menu"
                  size={28}
                  color={
                    currentRoute === "/"
                      ? colorScheme === "dark"
                        ? "rgb(230, 230, 250)" // phase2TitlesDark
                        : "rgb(30, 30, 60)" // phase2Titles
                      : "white"
                  }
                />

                <Text className="text-lg font-bold ml-2 text-phase2Titles dark:text-phase2TitlesDark">
                  BluEye
                </Text>
              </View>
              {/* Barra de navegación inferior */}
              <View className="w-full bg-phase2Cards dark:bg-phase2CardsDark border-t border-phase2Borders dark:border-phase2BordersDark">
                <View className="flex-row">
                  {/* Botón Inicio/Mapa */}
                  <Link
                    href="/"
                    className={`flex flex-1 flex-col py-2 items-center text-center ${
                      currentRoute === "/"
                        ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                        : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name="map"
                      size={28}
                      color={
                        currentRoute === "/"
                          ? colorScheme === "dark"
                            ? "rgb(230, 230, 250)" // phase2TitlesDark
                            : "rgb(30, 30, 60)" // phase2Titles
                          : "white"
                      }
                    />

                    <Text className="text-sm">Mapa</Text>
                  </Link>

                  {/* Botón Chat-AI */}
                  <Link
                    href="/chat-ai"
                    className={`flex flex-1 flex-col py-2 items-center text-center ${
                      currentRoute === "/chat-ai"
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
                    <Text className="text-sm">Chat-AI</Text>
                  </Link>

                  {/* Botón Configuración */}
                  <Link
                    href="/alarms"
                    className={`flex flex-1 flex-col py-2 items-center text-center justify-center ${
                      currentRoute === "/settings"
                        ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
                        : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name="bell-alert-outline"
                      size={28}
                      color={
                        currentRoute.startsWith("/settings")
                          ? colorScheme === "dark"
                            ? "rgb(230, 230, 250)" // phase2TitlesDark
                            : "rgb(30, 30, 60)" // phase2Titles
                          : "white"
                      }
                    />
                    <Text className="text-sm">Alertas</Text>
                  </Link>
                </View>
              </View>
            </View>
          </TamaguiProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DaltonicModeProvider>
  );
}
