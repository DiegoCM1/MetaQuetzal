import { Drawer } from "expo-router/drawer";
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
              <Drawer screenOptions={{ headerShown: true }}>
                <Drawer.Screen name="(tabs)" options={{ title: "Inicio" }} />
                <Drawer.Screen
                  name="SettingsScreen"
                  options={{ drawerLabel: "Ajustes" }}
                />
                <Drawer.Screen
                  name="AlarmScreen"
                  options={{ drawerLabel: "Alarma" }}
                />
                <Drawer.Screen
                  name="FeedbackScreen"
                  options={{ drawerLabel: "Feedback" }}
                />
                <Drawer.Screen
                  name="AlertDetailsScreen"
                  options={{ drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                  name="ChatAIScreen"
                  options={{ drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                  name="AlertsHistoryScreen"
                  options={{ drawerItemStyle: { display: "none" } }}
                />
              </Drawer>
            </TamaguiProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
    </GestureHandlerRootView>
  );
}
