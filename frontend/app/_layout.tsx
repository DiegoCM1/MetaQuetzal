import "../global.css";
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
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../utils/theme";
import { useEffect } from "react";
import { useFonts } from "expo-font";
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
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService"
import { usePathname } from "expo-router";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

interface NotificationData {
  alertId?: string
  alertLevel?: string
  fullScreen?: string
  category?: string
  alertTitle?: string
  alertMessage?: string
  bulletinUrl?: string
}

function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (!user) return
    registerForPushNotificationsAsync()
      .then((token) => console.log("Token guardado:", token))
      .catch(console.error)
  }, [user?.uid])

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!user && !inAuthGroup) {
      router.replace('/(auth)')
    } else if (user && inAuthGroup) {
      const checkAndRoute = async () => {
        const completed = await hasCompletedOnboarding()
        if (completed) {
          router.replace('/(tabs)/MapScreen')
        } else {
          router.replace('/onboarding/step1')
        }
      }
      checkAndRoute()
    }
  }, [user, loading, segments])

  return children
}

/* ---------- Layout raíz ---------- */
export default Sentry.wrap(function Layout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Square721': require('../assets/fonts/square-721-bold-extended-bt.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.otf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.otf'),
  });

  useEffect(() => {
    initAnalytics().catch(console.error);
  }, []);

  // Configure StatusBar to not be translucent (backup for native API)
  useEffect(() => {
    RNStatusBar.setTranslucent(false);
  }, []);

  useEffect(() => {
    setForegroundNotificationHandler();

    // 👇 Cuando el usuario pulse la notificación (o llegue automáticamente si es critical)
    const sub = addNotificationResponseListener(async (rawData) => {
      const data = rawData as NotificationData
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
      const data = initial?.notification?.request?.content?.data as NotificationData | undefined
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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" translucent={false} />
      <DaltonicModeProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <AuthGate>
                <ModelProvider>
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ flex: 1 }}
                  >
                  <Stack
                    screenOptions={{
                      headerTitleStyle: { fontWeight: "bold" },
                      contentStyle: { backgroundColor: "transparent" },
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
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="AlarmScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="FeedbackScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="alerts"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="educational"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="subscription"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                  <Toast />
                  </LinearGradient>
                </ModelProvider>
              </AuthGate>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
    </GestureHandlerRootView>
  );
});
