// frontend/utils/pushNotifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Alert } from "react-native";
import { toast } from "sonner-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from "./analytics";
import { authFetch } from './api'
import { API_BASE_URL } from './config'

const _LAST_TOKEN_KEY = 'push_last_registered_token';
// In-memory guard prevents concurrent calls with the same token from both POSTing
let _registrationInFlight: string | null = null;

export async function sendTokenToBackend(fcmToken: string): Promise<void> {
  if (_registrationInFlight === fcmToken) return;
  _registrationInFlight = fcmToken;  // set before any await — closes TOCTOU window

  let success = false;
  let lastErr: unknown;

  try {
    // Persistent deduplication: skip if token already registered successfully
    try {
      const stored = await AsyncStorage.getItem(_LAST_TOKEN_KEY);
      if (stored === fcmToken) return;   // finally handles _registrationInFlight = null
    } catch {
      // AsyncStorage unavailable — proceed with registration
    }

    const MAX = 3;
    for (let i = 0; i < MAX; i++) {
      try {
        const res = await authFetch(`${API_BASE_URL}/push-token`, {
          method: 'POST',
          body: JSON.stringify({ token: fcmToken }),
        });
        if (res.ok) {
          try {
            await AsyncStorage.setItem(_LAST_TOKEN_KEY, fcmToken);
          } catch { /* best-effort; next launch will re-POST (idempotent) */ }
          track('push_token_saved', { ok: true });
          success = true;
          break;
        }
        if (res.status < 500) break;                       // 4xx permanente — no reintentar
        lastErr = new Error(`HTTP ${res.status}`);
      } catch (err) {
        lastErr = err;                                     // error de red → reintentar
      }
      if (i < MAX - 1) await new Promise(r => setTimeout(r, 1000 * 2 ** i)); // 1s → 2s
    }
  } finally {
    _registrationInFlight = null;
  }

  if (!success) {
    console.error('Error enviando token al backend después de retries:', lastErr);
    track('push_token_saved', { ok: false, error: String(lastErr) });
    if (lastErr !== undefined) {
      // Only show Toast for transient failures (network errors, 5xx) — not for 4xx permanent
      toast.error('No se pudieron activar notificaciones', {
        description: 'Revisa tu conexión e intenta abrir la app de nuevo.',
      });
    }
  }
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push solo funciona en dispositivo físico");
    return null;
  }

  // 1) Permisos
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existingStatus === "granted"
      ? existingStatus
      : (await Notifications.requestPermissionsAsync()).status;

  track("push_permission", {
    status: finalStatus === "granted" ? "granted" : "denied",
  });

  if (finalStatus !== "granted") {
    Alert.alert(
      "Permiso denegado",
      "Sin permiso no se pueden recibir alertas de huracán",
    );
    return null;
  }

  // 2) Token nativo FCM (HTTP v1)
  const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
  console.log("FCM token →", fcmToken);

  await sendTokenToBackend(fcmToken);
  return fcmToken;
}

// Muestra un banner sencillo cuando llega la notificación
export function setForegroundNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });

  Notifications.addNotificationReceivedListener((notif) => {
    const { title, body } = notif.request.content;
    const data = notif.request.content.data;
    toast(title ?? '', { description: body ?? undefined });
    track("push_received_foreground", {
      alertId: data?.alertId ? String(data.alertId) : undefined,
    });
  });
}

// Devuelve el unsubscribe para limpiarlo en unuseEffect
export function addNotificationResponseListener(
  onTap: (
    data: Record<string, unknown>,
    content: { title?: string | null; body?: string | null },
  ) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const { data, title, body } = response.notification.request.content;
    onTap(data, { title, body });
  });
}
