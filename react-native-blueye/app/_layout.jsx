import { Slot, Link, useRouter } from "expo-router";
import { View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import {
  NavigationContainer,
  DrawerActions,
  useNavigation,
} from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import SettingsScreen from "./settings";   // ajusta la ruta si está en otro sub-folder


const Drawer = createDrawerNavigator(); // Create a Drawer Navigator

const PlaceholderScreen = () => (
  <View className="flex-1 items-center justify-center">
    <Text>En construcción</Text>
  </View>
);

function InnerApp() {
  const router = useRouter();
  const currentRoute = router?.pathname || "";
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();

  return (
    <View className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
      {/* Top Bar */}
      <View className="fixed top-0 left-0 right-0 flex-row items-center p-4 bg-phase2TopBar dark:bg-phase2TopBarDark z-10">
        <MaterialCommunityIcons
          name="menu"
          size={28}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          color={
            currentRoute === "/"
              ? colorScheme === "dark"
                ? "rgb(230, 230, 250)"
                : "rgb(30, 30, 60)"
              : "white"
          }
        />
      </View>

      {/* Slot */}
      <Slot />

      {/* Bottom Tabs */}
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
            href="/alerts"
            className={`flex flex-1 flex-col py-2 items-center text-center justify-center ${
              currentRoute === "/alerts"
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
  );
}

/* ---------- Layout raíz ---------- */
export default function Layout() {
  return (
    <DaltonicModeProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <TamaguiProvider config={config} defaultTheme="light">
            <NavigationContainer className="bg-phase2Buttons dark:bg-phase2bgDark">
              <Drawer.Navigator screenOptions={{ headerShown: false }}>
                <Drawer.Screen name="Home" component={InnerApp} />
                <Drawer.Screen name="Settings" component={SettingsScreen} />
                <Drawer.Screen name="Feedback" component={PlaceholderScreen} />
              </Drawer.Navigator>
            </NavigationContainer>
          </TamaguiProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </DaltonicModeProvider>
  );
}
