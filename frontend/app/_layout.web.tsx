import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { ModelProvider } from './ai/_context/ModelContext';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
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

const DEV_BYPASS_AUTH = true

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
  const authEnabled = !DEV_BYPASS_AUTH

  useEffect(() => {
    if (!authEnabled || !user) return
    registerForPushNotificationsAsync()
      .then((token) => console.log("Token guardado:", token))
      .catch(console.error)
  }, [authEnabled, user?.uid])

  useEffect(() => {
    if (loading) return
    if (!authEnabled) {
      const inTabsGroup = segments[0] === '(tabs)'
      if (!inTabsGroup) {
        router.replace('/(tabs)/MapScreen')
      }
      return
    }
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
  }, [authEnabled, user, loading, segments])

  return children
}

export default function Layout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'Square721': require('../assets/fonts/square-721-bold-extended-bt.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.otf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.otf'),
  });

  useEffect(() => {
    initAnalytics().catch(console.error);
  }, []);

  useEffect(() => {
    RNStatusBar.setTranslucent(false);
  }, []);

  useEffect(() => {
    setForegroundNotificationHandler();

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

    return () => sub.remove();
  }, []);

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
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="SettingsScreen" options={{ headerShown: false }} />
                      <Stack.Screen name="AlarmScreen" options={{ headerShown: false }} />
                      <Stack.Screen name="FeedbackScreen" options={{ headerShown: false }} />
                      <Stack.Screen name="alerts" options={{ headerShown: false }} />
                      <Stack.Screen name="educational" options={{ headerShown: false }} />
                      <Stack.Screen name="subscription" options={{ headerShown: false }} />
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
}
