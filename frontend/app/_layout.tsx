import "../global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { ModelProvider } from './ai/_context/ModelContext';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
// import { Drawer } from "expo-router/drawer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { DaltonicModeProvider } from "../context/DaltonicModeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../utils/theme";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import { Alert, AppState, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  registerForPushNotificationsAsync,
  sendTokenToBackend,
  setForegroundNotificationHandler,
  addNotificationResponseListener,
} from "../utils/pushNotifications";
import * as Notifications from "expo-notifications";
import { Toaster, toast } from "sonner-native";
import { initAnalytics, track, flush } from "../utils/analytics"
import { flushSOSQueue, shouldConfirmPendingSOS } from "./map/sosQueue"
import { PENDING_SOS_INVITE_KEY } from "./sos-invite/[token]";
import { hasCompletedOnboarding } from "./onboarding/_services/onboardingService"
import { usePathname } from "expo-router";
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

if (Platform.OS !== "web") {
  const { initExecutorch } = require("react-native-executorch");
  const { ExpoResourceFetcher } = require("react-native-executorch-expo-resource-fetcher");
  initExecutorch({ resourceFetcher: ExpoResourceFetcher });
}
const DEV_BYPASS_AUTH = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true'

interface NotificationData {
  alertId?: string
  alert_id?: string
  alertLevel?: string
  level?: string
  siat_level?: string
  siat_color?: string
  fullScreen?: string
  category?: string
  alertTitle?: string
  alertMessage?: string
  bulletinUrl?: string
  sender_name?: string
  lat?: string
  lon?: string
  invite_token?: string
  inviter_display_name?: string
}

function resolveNotifPayload(
  data: NotificationData,
  content?: { title?: string | null; body?: string | null }
) {
  const id = data.alertId || data.alert_id
  const levelNum = Number(data.level ?? data.siat_level ?? data.alertLevel ?? 0)
  const isFullScreen = data.fullScreen === 'true' || levelNum >= 4
  const isSos = data.category === 'sos'
  const isSosInvite = data.category === 'sos_invite'
  const sosLat = parseFloat(data.lat ?? '')
  const sosLon = parseFloat(data.lon ?? '')
  const sosHasCoords = Number.isFinite(sosLat) && Number.isFinite(sosLon)
  return {
    id,
    levelNum,
    isFullScreen,
    isSos,
    isSosInvite,
    inviteToken: data.invite_token,
    inviterDisplayName: data.inviter_display_name ?? 'Un usuario',
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
    const tokenSub = Notifications.addPushTokenListener(({ data }) => {
      sendTokenToBackend(data).catch(console.error)
    })
    return () => tokenSub.remove()
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

/* ---------- Layout raíz ---------- */
export default Sentry.wrap(function Layout() {
  const router = useRouter();
  const alarmActiveRef = React.useRef(false);

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

    // Tap en notificación (background → foreground, o foreground tap)
    const tapSub = addNotificationResponseListener(async (rawData, content) => {
      const data = rawData as NotificationData
      const { id, isFullScreen, isSos, isSosInvite, inviteToken, inviterDisplayName, senderName, sosLat, sosLon, sosHasCoords, params } = resolveNotifPayload(data, content)
      console.log('[QA_NOTIF] tap | alertId:', id ?? 'none', '| fullScreen:', isFullScreen, '| sos:', isSos, '| sosInvite:', isSosInvite)

      await initAnalytics();
      track("push_open", {
        alertId: id ? String(id) : undefined,
        alertLevel: isSos || isSosInvite ? undefined : (params.category ? Number(params.category) : undefined),
        fullScreen: isFullScreen,
        origin: "listener",
      });

      if (isSosInvite && inviteToken) {
        console.log('[QA_NAV] tap → sos-invite | token:', inviteToken)
        AsyncStorage.setItem(PENDING_SOS_INVITE_KEY, inviteToken).catch(() => {});
        router.push({ pathname: "/sos-invite/[token]", params: { token: inviteToken } });
        return;
      }
      if (isSos) {
        const coordsText = sosHasCoords ? `\nUbicación: ${sosLat.toFixed(5)}, ${sosLon.toFixed(5)}` : '';
        Alert.alert('SOS recibido', `${senderName} necesita ayuda urgente.${coordsText}`);
        return;
      }
      if (isFullScreen) {
        console.log('[QA_NAV] tap → AlarmScreen | alertId:', id ?? 'none', '| category:', params.category)
        router.push({ pathname: "AlarmScreen", params });
      } else if (id) {
        console.log('[QA_NAV] tap → alert detail | alertId:', id)
        router.push({ pathname: "/alerts/[id]", params: { id } });
      } else {
        console.log('[QA_NAV] tap → alerts list (no alertId)')
        router.push("/alerts");
      }
    });

    // Notificación recibida mientras la app está abierta → AlarmScreen si nivel >= 4
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const rawData = notification.request.content.data as NotificationData
      const content = notification.request.content
      const { isFullScreen, isSos, isSosInvite, inviteToken, inviterDisplayName, senderName, params } = resolveNotifPayload(rawData, content)
      console.log('[QA_NOTIF] received foreground | fullScreen:', isFullScreen, '| sos:', isSos, '| sosInvite:', isSosInvite, '| category:', params.category)
      if (isFullScreen && !alarmActiveRef.current) {
        alarmActiveRef.current = true
        console.log('[QA_NAV] received → AlarmScreen | category:', params.category, '| alertId:', params.alertId ?? 'none')
        router.push({ pathname: "AlarmScreen", params })
        // Liberar el guard después de un debounce para cubrir multi-push
        setTimeout(() => { alarmActiveRef.current = false }, 5000)
        return;
      }
      if (isSosInvite && inviteToken) {
        console.log('[QA_SOS_INVITE] foreground received | saving token:', inviteToken)
        AsyncStorage.setItem(PENDING_SOS_INVITE_KEY, inviteToken).catch(() => {});
        toast(`Invitación SOS de ${inviterDisplayName}`, {
          description: 'Toca para aceptar la invitación.',
          action: {
            label: 'Ver',
            onClick: () => router.push({ pathname: "/sos-invite/[token]", params: { token: inviteToken } }),
          },
        });
        return;
      }
      if (isSos) {
        toast.error(`SOS — ${senderName}`, {
          description: 'Necesita ayuda urgente. Revisa tu pantalla.',
        });
      }
    });

    return () => {
      tapSub.remove();
      receivedSub.remove();
    };
  }, []);

  // App abierta tocando una notificación desde cold start
  useEffect(() => {
    (async () => {
      const initial = await Notifications.getLastNotificationResponseAsync();
      if (!initial) return;

      // Deduplicate: skip if this notification was already handled (prevents stale
      // notifications from being re-processed on hot reload or subsequent app mounts)
      const notifId = initial.notification.request.identifier;
      const LAST_COLD_KEY = '@BluEye:last_cold_start_notif';
      try {
        const lastProcessed = await AsyncStorage.getItem(LAST_COLD_KEY);
        if (lastProcessed === notifId) return;
        await AsyncStorage.setItem(LAST_COLD_KEY, notifId);
      } catch { /* AsyncStorage unavailable — proceed */ }

      const data = initial.notification.request.content.data as NotificationData | undefined
      if (!data) return
      const { title: coldTitle, body: coldBody } = initial.notification.request.content

      const { id, isFullScreen, isSos, isSosInvite, inviteToken, senderName, sosLat, sosLon, sosHasCoords, params } = resolveNotifPayload(data, { title: coldTitle, body: coldBody })
      if (!id && !isFullScreen && !isSos && !isSosInvite) return

      await initAnalytics();
      track("push_open", {
        alertId: id ? String(id) : undefined,
        alertLevel: isSos || isSosInvite ? undefined : (params.category ? Number(params.category) : undefined),
        fullScreen: isFullScreen,
        origin: "initial",
      });

      if (isSosInvite && inviteToken) {
        console.log('[QA_NAV] cold start → sos-invite | token:', inviteToken)
        AsyncStorage.setItem(PENDING_SOS_INVITE_KEY, inviteToken).catch(() => {});
        router.push({ pathname: "/sos-invite/[token]", params: { token: inviteToken } });
        return;
      }
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
      <KeyboardProvider>
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
                      name="sos-invite/[token]"
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
                    <Stack.Screen
                      name="profile"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                  <Toaster />
                  </LinearGradient>
                </ModelProvider>
              </AuthGate>
            </AuthProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </DaltonicModeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
});
