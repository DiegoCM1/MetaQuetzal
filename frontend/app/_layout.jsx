import { Stack } from "expo-router";
// import { Drawer } from "expo-router/drawer";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/* ---------- Layout raíz ---------- */
export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DaltonicModeProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <TamaguiProvider config={config} defaultTheme="light">
              <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-phase2ButtonsDark dark:bg-phase2bgDark">
                <Stack
                  screenOptions={{
                    headerStyle: { backgroundColor: "rgb(50,180,200)" },
                    headerTintColor: "#fff",
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
