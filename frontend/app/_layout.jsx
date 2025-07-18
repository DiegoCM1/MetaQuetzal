import { Stack } from "expo-router";
// import { Drawer } from "expo-router/drawer";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";

/* ---------- Layout raíz ---------- */
export default function Layout() {
  const { colorScheme } = useColorScheme();
  const headerBg =
    colorScheme === "dark" ? "rgb(40, 60, 80)" : "rgb(60, 200, 220)";
  const headerTint = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#fff";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DaltonicModeProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <TamaguiProvider config={config} defaultTheme="light">
              <SafeAreaView
                style={{ flex: 1, backgroundColor: headerBg }}
                edges={["top"]}
              >
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: headerBg },
                    headerTintColor: headerTint,
                    headerTitleStyle: { fontWeight: "bold" },
                  }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="SettingsScreen"
                    options={{ title: "Ajustes" }}
                  />
                  <Stack.Screen
                    name="AlarmScreen"
                    options={{ title: "Alarma" }}
                  />
                  <Stack.Screen
                    name="FeedbackScreen"
                    options={{ title: "Feedback" }}
                  />
                  <Stack.Screen
                    name="AlertDetailsScreen"
                    options={{ title: "Detalles de Alerta" }}
                  />
                  <Stack.Screen
                    name="ChatAIScreen"
                    options={{ title: "Chat-AI" }}
                  />
                  <Stack.Screen
                    name="AlertsHistoryScreen"
                    options={{ title: "Alertas" }}
                  />
                  <Stack.Screen
                    name="AboutScreen"
                    options={{ title: "Acerca de nosotros" }}
                  />
                </Stack>
              </SafeAreaView>
            </TamaguiProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
    </GestureHandlerRootView>
  );
}
