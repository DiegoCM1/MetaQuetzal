import { Stack, useRouter, useSegments } from "expo-router";
import { initExecutorch } from 'react-native-executorch';
import { ExpoResourceFetcher } from 'react-native-executorch-expo-resource-fetcher';
import { ModelProvider } from './ai/_context/ModelContext';
import { AuthProvider, useAuth } from './(auth)/_context/AuthContext';

initExecutorch({ resourceFetcher: ExpoResourceFetcher });
// import { Drawer } from "expo-router/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { AppState, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  registerForPushNotificationsAsync,
  setForegroundNotificationHandler,
  addNotificationResponseListener,
} from "../utils/pushNotifications";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { initAnalytics, track, flush } from "../utils/analytics";
import { usePathname } from "expo-router";

function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) router.replace('/(auth)')
    if (user && inAuthGroup) router.replace('/(tabs)')
  }, [user, loading])

  return children
}

/* ---------- Layout raíz ---------- */
export default function Layout() {
  const router = useRouter();

  const { colorScheme } = useColorScheme();

  useEffect(() => {
    initAnalytics().catch(console.error);
  }, []);

  // Configure StatusBar to not be translucent (backup for native API)
  useEffect(() => {
    RNStatusBar.setTranslucent(false);
  }, []);

  // ⚡ Solicitar token FCM al montar
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        // Aquí podrías enviarlo a tu backend si quieres
        console.log("Token guardado:", token);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setForegroundNotificationHandler();

    // 👇 Cuando el usuario pulse la notificación (o llegue automáticamente si es critical)
    const sub = addNotificationResponseListener(async (data) => {
      if (data?.alertId) {
        await initAnalytics();
        track("push_open", {
          alertId: String(data.alertId),
          alertLevel: data.alertLevel ? Number(data.alertLevel) : undefined,
          fullScreen: data.fullScreen === 'true',
          origin: "listener",
        });

        // Si es full-screen (crítica cat 3+) → AlarmScreen
        // Si no → Alert details
        if (data.fullScreen === 'true') {
          router.push({
            pathname: "AlarmScreen",
            params: {
              alertId: data.alertId,
              category: data.category || data.alertLevel,
              title: data.alertTitle || "Alerta de huracán",
              message: data.alertMessage || "Diríjase a un refugio seguro",
              bulletinUrl: data.bulletinUrl || "https://www.nhc.noaa.gov/",
            },
          });
        } else {
          router.push({
            pathname: "/alerts/[id]",
            params: { id: data.alertId },
          });
        }
      }
    });

    return () => sub.remove(); // limpia al desmontar
  }, []);

  // Si la app se abrió tocando una notificación, esta llamada la devuelve
  useEffect(() => {
    (async () => {
      const initial = await Notifications.getLastNotificationResponseAsync();
      const data = initial?.notification?.request?.content?.data;
      const alertId = data?.alertId;

      if (alertId) {
        await initAnalytics();
        track("push_open", {
          alertId: String(alertId),
          alertLevel: data?.alertLevel ? Number(data.alertLevel) : undefined,
          fullScreen: data?.fullScreen === 'true',
          origin: "initial",
        });

        // Si es full-screen (crítica cat 3+) → AlarmScreen
        // Si no → Alert details
        if (data?.fullScreen === 'true') {
          router.push({
            pathname: "AlarmScreen",
            params: {
              alertId: data.alertId,
              category: data.category || data.alertLevel,
              title: data.alertTitle || "Alerta de huracán",
              message: data.alertMessage || "Diríjase a un refugio seguro",
              bulletinUrl: data.bulletinUrl || "https://www.nhc.noaa.gov/",
            },
          });
        } else {
          router.push({
            pathname: "/alerts/[id]",
            params: { id: alertId },
          });
        }
      }
    })();
  }, []);

  // Registra la pantalla actual en Mixpanel
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) {
      (async () => {
        await initAnalytics();
        track("screen_view", { screen: pathname });
      })();
    }
  }, [pathname]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        track("app_background");
        flush();
      }
    });
    return () => sub.remove();
  }, []);

  const headerBg =
    colorScheme === "dark" ? "rgb(40, 60, 80)" : "rgb(60, 200, 220)";
  const headerTint = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#fff";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={headerBg} translucent={false} />
      <DaltonicModeProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <AuthGate>
              <ModelProvider>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: headerBg },
                  headerTintColor: headerTint,
                  headerTitleStyle: { fontWeight: "bold" },
                }}
              >
                  <Stack.Screen
                    name="(auth)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="onboarding"
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
                    name="alerts"
                    options={{ headerShown: false }}
                  />
                </Stack>
              <Toast />
              </ModelProvider>
              </AuthGate>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
    </GestureHandlerRootView>
  );
}
