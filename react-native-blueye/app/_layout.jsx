import { Slot, Link, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";

/* ---------- Layout raíz ---------- */
export default function Layout() {
  const router = useRouter();
  const currentRoute = router?.pathname || "";
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();
  const MAIN_TABS = ["", "chat-ai", "alerts"];

  const isMainTab = MAIN_TABS.some((path) => currentRoute.startsWith(path));

  const handleTopIconPress = () => {
    // Si no estamos en un tab principal, volvemos al Home,  Si estamos en un tab principal, abrimos el Drawer
    if (isMainTab) {
      navigation.dispatch(DrawerActions.openDrawer());
      console.log("Opening drawer");
    } else if (navigation.canGoBack()) {
      navigation.goBack();
      console.log("Going back");
    } else {
      router.replace("/"); // fallback al Home
    }
  };

  return (
    <DaltonicModeProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme="light">
            <Drawer className="flex-1" screenOptions={{ headerShown: false }}>
              <Drawer.Screen name="index" />
              <Drawer.Screen
                name="settings"
                options={{ drawerLabel: "Ajustes" }} // rename if you like
              />
              <Drawer.Screen
                name="alarmScreen"
                options={{ drawerLabel: "Alarma" }}
              />

              {/* Hide every other route that expo-router auto-adds */}
              <Drawer.Screen
                name="chat-ai"
                options={{ drawerItemStyle: { display: "none" } }}
              />
              <Drawer.Screen
                name="alerts"
                options={{ drawerItemStyle: { display: "none" } }}
              />
                            <Drawer.Screen
                name="payment"
                options={{ drawerItemStyle: { display: "none" } }}
              />
                            <Drawer.Screen
                name="alerts-info"
                options={{ drawerItemStyle: { display: "none" } }}
              />
                            <Drawer.Screen
                name="monetization"
                options={{ drawerItemStyle: { display: "none" } }}
              />
                            <Drawer.Screen
                name="SubscriptionScreen"
                options={{ drawerItemStyle: { display: "none" } }}
              />
            </Drawer>
            <View className=" bg-phase2bg dark:bg-phase2bgDark">
              {/* Top Bar */}
              <View className="fixed top-0 left-0 right-0 flex-row items-center p-4 bg-phase2TopBar dark:bg-phase2TopBarDark z-10">
                <MaterialCommunityIcons
                  name={isMainTab ? "menu" : "arrow-left"}
                  size={28}
                  onPress={handleTopIconPress}
                  color={
                    isMainTab && currentRoute === "/"
                      ? colorScheme === "dark"
                        ? "rgb(230, 230, 250)"
                        : "rgb(30, 30, 60)"
                      : "rgb(30, 30, 60)"
                  }
                />
              </View>

            </View>
          </TamaguiProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DaltonicModeProvider>
  );
}
