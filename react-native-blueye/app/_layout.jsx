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
import SettingsScreen from "./settings"; // ajusta la ruta si está en otro sub-folder
import alarmScreen from "./alarmScreen"; // ajusta la ruta si está en otro sub-folder

// function InnerApp() {
//   const router = useRouter();
//   const currentRoute = router?.pathname || "";
//   const { colorScheme } = useColorScheme();
//   const navigation = useNavigation();
//   const MAIN_TABS = ["", "chat-ai", "alerts"];

//   const isMainTab = MAIN_TABS.some((path) => currentRoute.startsWith(path));

//   const handleTopIconPress = () => {
//     console.log("PATH", router.pathname, "SEG", router.segments);

//     // Si no estamos en un tab principal, volvemos al Home,  Si estamos en un tab principal, abrimos el Drawer
//     if (isMainTab) {
//       navigation.dispatch(DrawerActions.openDrawer());
//       console.log("Opening drawer");
//     } else if (navigation.canGoBack()) {
//       navigation.goBack();
//       console.log("Going back");
//     } else {
//       router.replace("/"); // fallback al Home
//     }
//   };

//   console.log("RENDER", router.pathname);

//   return (
//     <View className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
//       {/* Top Bar */}
//       <View className="fixed top-0 left-0 right-0 flex-row items-center p-4 bg-phase2TopBar dark:bg-phase2TopBarDark z-10">
//         <MaterialCommunityIcons
//           name={isMainTab ? "menu" : "arrow-left"}
//           size={28}
//           onPress={handleTopIconPress}
//           color={
//             isMainTab && currentRoute === "/"
//               ? colorScheme === "dark"
//                 ? "rgb(230, 230, 250)"
//                 : "rgb(30, 30, 60)"
//               : "white"
//           }
//         />
//       </View>

//       {/* Slot */}
//       <Slot />

//       {/* Bottom Tabs */}
//       <View className="w-full bg-phase2Cards dark:bg-phase2CardsDark border-t border-phase2Borders dark:border-phase2BordersDark">
//         <View className="flex-row">
//           {/* Botón Inicio/Mapa */}
//           <Link
//             href="/"
//             className={`flex flex-1 flex-col py-2 items-center text-center ${
//               currentRoute === "/"
//                 ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
//                 : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
//             }`}
//           >
//             <MaterialCommunityIcons
//               name="map"
//               size={28}
//               color={
//                 currentRoute === "/"
//                   ? colorScheme === "dark"
//                     ? "rgb(230, 230, 250)" // phase2TitlesDark
//                     : "rgb(30, 30, 60)" // phase2Titles
//                   : "white"
//               }
//             />

//             <Text className="text-sm">Mapa</Text>
//           </Link>

//           {/* Botón Chat-AI */}
//           <Link
//             href="/chat-ai"
//             className={`flex flex-1 flex-col py-2 items-center text-center ${
//               currentRoute === "/chat-ai"
//                 ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
//                 : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
//             }`}
//           >
//             <MaterialCommunityIcons
//               name="robot-happy"
//               size={28}
//               color={
//                 currentRoute.startsWith("/chat-ai")
//                   ? colorScheme === "dark"
//                     ? "rgb(230, 230, 250)" // phase2TitlesDark
//                     : "rgb(30, 30, 60)" // phase2Titles
//                   : "white"
//               }
//             />
//             <Text className="text-sm">Chat-AI</Text>
//           </Link>

//           {/* Botón Configuración */}
//           <Link
//             href="/alerts"
//             className={`flex flex-1 flex-col py-2 items-center text-center justify-center ${
//               currentRoute === "/alerts"
//                 ? "bg-phase2Cards dark:bg-phase2CardsDark text-phase2Titles dark:text-phase2TitlesDark"
//                 : "bg-phase2Buttons dark:bg-phase2ButtonsDark text-white hover:bg-phase2Borders dark:hover:bg-phase2BordersDark"
//             }`}
//           >
//             <MaterialCommunityIcons
//               name="bell-alert-outline"
//               size={28}
//               color={
//                 currentRoute.startsWith("/alerts")
//                   ? colorScheme === "dark"
//                     ? "rgb(230, 230, 250)" // phase2TitlesDark
//                     : "rgb(30, 30, 60)" // phase2Titles
//                   : "white"
//               }
//             />
//             <Text className="text-sm">Alertas</Text>
//           </Link>
//         </View>
//       </View>
//     </View>
//   );
// }

/* ────────── TopBar global ────────── */
function TopBar() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colorScheme } = useColorScheme();

  // último segmento de la ruta ("index", "chat-ai", "alerts", etc.)
  const segments = router.segments;
  const last = segments[segments.length - 1] || "index";
  const isMainTab = ["index", "chat-ai", "alerts"].includes(last);

  const handlePress = () => {
    if (isMainTab) {
      navigation.dispatch(DrawerActions.openDrawer());
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/");
    }
  };

  return (
    <View className="fixed top-0 left-0 right-0 flex-row items-center p-4 bg-phase2TopBar dark:bg-phase2TopBarDark z-10">
      <MaterialCommunityIcons
        name={isMainTab ? "menu" : "arrow-left"}
        size={28}
        onPress={handlePress}
        color={
          isMainTab && last === "index"
            ? colorScheme === "dark"
              ? "rgb(230,230,250)"
              : "rgb(30,30,60)"
            : "white"
        }
      />
    </View>
  );
}

/* ---------- Layout raíz ---------- */
export default function Layout() {
  const router = useRouter();
  const currentRoute = router?.pathname || "";
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation();
  const MAIN_TABS = ["", "chat-ai", "alerts"];

  const isMainTab = MAIN_TABS.some((path) => currentRoute.startsWith(path));

  const handleTopIconPress = () => {
    console.log("PATH", router.pathname, "SEG", router.segments);

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
            <Drawer screenOptions={{ headerShown: false }}>
              <Drawer.Screen name="index" />
              <Drawer.Screen name="settings" />
              <Drawer.Screen name="alarmScreen" />
            </Drawer>
            <View className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
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
                      : "white"
                  }
                />
              </View>


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
                        currentRoute.startsWith("/alerts")
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
