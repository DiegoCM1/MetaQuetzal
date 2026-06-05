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
<<<<<<< HEAD
import { Alert, AppState, Platform, StatusBar as RNStatusBar } from "react-native";
=======
import { AppState, StatusBar as RNStatusBar } from "react-native";
>>>>>>> 0323521 (feat: add local nearby chat prototype)
import { StatusBar } from "expo-status-bar";
import {
  registerForPushNotificationsAsync,
  setForegroundNotificationHandler,
  addNotificationResponseListener,
} from "../utils/pushNotifications";
import * as Notifications from "expo-notifications";
import Toast from "react-native-toast-message";
import { initAnalytics, track, flush } from "../utils/analytics"
import { flushSOSQueue, shouldConfirmPendingSOS } from "./map/sosQueue";
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService"
import { usePathname } from "expo-router";

interface NotificationData {
  alertId?: string
  alertLevel?: string
  fullScreen?: string
  category?: string
  alertTitle?: string
  alertMessage?: string
  bulletinUrl?: string
  sender_name?: string
  lat?: string
  lon?: string
}

<<<<<<< HEAD
function resolveNotifPayload(
  data: NotificationData,
  content?: { title?: string | null; body?: string | null }
) {
  const id = data.alertId || data.alert_id
  const levelNum = Number(data.level ?? data.siat_level ?? data.alertLevel ?? 0)
  const isFullScreen = data.fullScreen === 'true' || levelNum >= 4
  const isSos = data.category === 'sos'
  const sosLat = parseFloat(data.lat ?? '')
  const sosLon = parseFloat(data.lon ?? '')
  const sosHasCoords = Number.isFinite(sosLat) && Number.isFinite(sosLon)
  return {
    id,
    levelNum,
    isFullScreen,
    isSos,
    senderName: data.sender_name ?? 'Un contacto',
    sosLat,
    sosLon,
    sosHasCoords,
    params: {
      alertId: id,
      category: data.category ?? String(levelNum),
      title: data.alertTitle ?? content?.title ?? "Alerta de emergencia",
      message: data.alertMessage ?? content?.body ?? "Siga las indicaciones de las autoridades.",
      bulletinUrl: data.bulletinUrl,
    },
  }
}

=======
>>>>>>> 0323521 (feat: add local nearby chat prototype)
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

  // Configure StatusBar to not be translucent (backup for native API)
  useEffect(() => {
    RNStatusBar.setTranslucent(false);
  }, []);

  useEffect(() => {
    setForegroundNotificationHandler();

    // 👇 Cuando el usuario pulse la notificación (o llegue automáticamente si es critical)
    const sub = addNotificationResponseListener(async (rawData) => {
      const data = rawData as NotificationData
<<<<<<< HEAD
      const { id, isFullScreen, isSos, senderName, sosLat, sosLon, sosHasCoords, params } = resolveNotifPayload(data)
      if (!id && !isFullScreen && !isSos) return

      await initAnalytics();
      track("push_open", {
        alertId: id ? String(id) : undefined,
        alertLevel: isSos ? undefined : (params.category ? Number(params.category) : undefined),
        fullScreen: isFullScreen,
        origin: "listener",
      });

      if (isSos) {
        const coordsText = sosHasCoords ? `\nUbicación: ${sosLat.toFixed(5)}, ${sosLon.toFixed(5)}` : '';
        Alert.alert('SOS recibido', `${senderName} necesita ayuda urgente.${coordsText}`);
        return;
      }
      if (isFullScreen) {
        router.push({ pathname: "AlarmScreen", params });
      } else if (id) {
        router.push({ pathname: "/alerts/[id]", params: { id } });
      }
    });

    // Notificación recibida mientras la app está abierta → AlarmScreen si nivel >= 4
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const rawData = notification.request.content.data as NotificationData
      const content = notification.request.content
      const { isFullScreen, isSos, senderName, params } = resolveNotifPayload(rawData, content)
      if (isFullScreen && !alarmActiveRef.current) {
        alarmActiveRef.current = true
        router.push({ pathname: "AlarmScreen", params })
        // Liberar el guard después de un debounce para cubrir multi-push
        setTimeout(() => { alarmActiveRef.current = false }, 5000)
        return;
      }
      if (isSos) {
        Toast.show({
          type: 'error',
          text1: `SOS — ${senderName}`,
          text2: 'Necesita ayuda urgente. Revisa tu pantalla.',
        });
      }
    });

    return () => {
      tapSub.remove();
      receivedSub.remove();
    };
=======
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
>>>>>>> 0323521 (feat: add local nearby chat prototype)
  }, []);

  // Si la app se abrió tocando una notificación, esta llamada la devuelve
  useEffect(() => {
    (async () => {
      const initial = await Notifications.getLastNotificationResponseAsync();
      const data = initial?.notification?.request?.content?.data as NotificationData | undefined
      const alertId = data?.alertId;

<<<<<<< HEAD
      const { id, isFullScreen, isSos, senderName, sosLat, sosLon, sosHasCoords, params } = resolveNotifPayload(data)
      if (!id && !isFullScreen && !isSos) return

      await initAnalytics();
      track("push_open", {
        alertId: id ? String(id) : undefined,
        alertLevel: isSos ? undefined : (params.category ? Number(params.category) : undefined),
        fullScreen: isFullScreen,
        origin: "initial",
      });

      if (isSos) {
        const coordsText = sosHasCoords ? `\nUbicación: ${sosLat.toFixed(5)}, ${sosLon.toFixed(5)}` : '';
        Alert.alert('SOS recibido', `${senderName} necesita ayuda urgente.${coordsText}`);
        return;
      }
      if (isFullScreen) {
        router.push({ pathname: "AlarmScreen", params });
      } else if (id) {
        router.push({ pathname: "/alerts/[id]", params: { id } });
=======
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
>>>>>>> 0323521 (feat: add local nearby chat prototype)
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
      if (state === "active") {
        shouldConfirmPendingSOS().then((needsConfirm) => {
          if (!needsConfirm) flushSOSQueue();
          // Si needsConfirm: MapScreen mostrará el Alert cuando el usuario vuelva al mapa.
        });
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
<<<<<<< HEAD
                      name="NotificationPreferencesScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="SOSContactsScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="NotificationTestScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="sos-invite"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
=======
>>>>>>> 0323521 (feat: add local nearby chat prototype)
                      name="AlarmScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="FeedbackScreen"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="local-chat"
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
}
