import { Stack } from "expo-router";
// import { Drawer } from "expo-router/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
               <Stack screenOptions={{ headerShown: true }}>
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false }}
                />
                 <Stack.Screen name="SettingsScreen" options={{ title: "Ajustes" }} />
                <Stack.Screen name="AlarmScreen" options={{ title: "Alarma" }} />
                <Stack.Screen name="FeedbackScreen" options={{ title: "Feedback" }} />
                <Stack.Screen
                  name="AlertDetailsScreen"
                         options={{ presentation: "modal" }}
                />
                                <Stack.Screen name="ChatAIScreen" options={{ title: "Chat-AI" }} />
                <Stack.Screen name="AlertsHistoryScreen" options={{ title: "Alertas" }} />
              </Stack>
            </TamaguiProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
    </GestureHandlerRootView>
  );
}
