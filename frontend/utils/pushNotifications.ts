// frontend/utils/pushNotifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import { Alert, DeviceEventEmitter, Linking, Platform } from "react-native";
import { toast } from "sonner-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from "./analytics";
import { authFetch } from './api'
import { API_BASE_URL } from './config'

const BATTERY_OPT_ASKED_KEY  = '@blueeye:battery_opt_asked';
const HEADS_UP_ASKED_KEY     = '@blueeye:heads_up_asked_v2'; // v2 = sos_emergency channel

export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const alreadyAsked = await AsyncStorage.getItem(BATTERY_OPT_ASKED_KEY);
    if (alreadyAsked) return;
    await AsyncStorage.setItem(BATTERY_OPT_ASKED_KEY, 'true');
  } catch { /* AsyncStorage unavailable — still show the dialog */ }

  Alert.alert(
    'Alertas de emergencia',
    'Para que BluEye pueda avisarte aunque el teléfono esté inactivo, necesita permiso para funcionar en segundo plano sin restricciones.',
    [
      { text: 'Ahora no', style: 'cancel' },
      {
        text: 'Permitir',
        onPress: async () => {
          try {
            await IntentLauncher.startActivityAsync(
              'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
              { data: 'package:com.bluai.app' }
            );
          } catch {
            // Si el intent falla (algunos OEM lo bloquean), abrir ajustes de la app
            await IntentLauncher.startActivityAsync(
              IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
              { data: 'package:com.bluai.app' }
            );
          }
        },
      },
    ]
  );
}

// Show once: ask the user to enable heads-up / floating notifications for the
// sos_emergency channel. Android lets apps open the exact channel settings screen so
// the user just needs to toggle "Mostrar en pantalla" (MIUI) / "Show as pop-up"
// (stock Android). Called after battery-opt so both dialogs don't overlap.
export async function requestHeadsUpPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const alreadyAsked = await AsyncStorage.getItem(HEADS_UP_ASKED_KEY);
    if (alreadyAsked) return;
    await AsyncStorage.setItem(HEADS_UP_ASKED_KEY, 'true');
  } catch { /* proceed */ }

  Alert.alert(
    'Notificaciones a pantalla completa',
    'Para que las alertas SOS aparezcan sobre cualquier pantalla (incluso con el teléfono bloqueado), activa "Mostrar en pantalla" en los ajustes del canal SOS.',
    [
      { text: 'Ahora no', style: 'cancel' },
      {
        text: 'Configurar',
        onPress: async () => {
          try {
            // Opens the exact sos_emergency channel settings where the user can
            // enable "Floating notifications" / "Show as pop-up" / "Mostrar en pantalla"
            await IntentLauncher.startActivityAsync(
              'android.settings.CHANNEL_NOTIFICATION_SETTINGS',
              {
                extra: {
                  'android.provider.extra.APP_PACKAGE': 'com.bluai.app',
                  'android.provider.extra.CHANNEL_ID': 'sos_emergency',
                },
              }
            );
          } catch {
            // Fallback: open the general app notification settings page
            await Linking.openSettings();
          }
        },
      },
    ]
  );
}

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

export async function setupNotificationChannels() {
  if (Platform.OS !== "android") return;
  // Delete old channel so Android re-creates it at MAX importance.
  // Android never upgrades a channel's importance once created; the only fix is
  // to delete and recreate with the new importance level.
  // No delete needed — sos_emergency is a new ID that has never existed on any
  // device, so Android creates it fresh at IMPORTANCE_MAX every time.
  await Notifications.setNotificationChannelAsync("sos_emergency", {
    name: "Alertas SOS",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
  // Silent channel for background data-refresh pushes — no banner, no sound, hidden in drawer
  await Notifications.setNotificationChannelAsync("contacts_refresh_silent", {
    name: "Sincronización de contactos",
    importance: Notifications.AndroidImportance.MIN,
    enableVibrate: false,
    showBadge: false,
  });
}

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log("Push solo funciona en dispositivo físico");
    return null;
  }

  await setupNotificationChannels();

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

  // 3) Battery optimization exemption — solo aparece una vez
  requestBatteryOptimizationExemption();
  // 4) Heads-up / floating notifications — mostramos 2 s después para no superponer dialogs
  setTimeout(() => requestHeadsUpPermission(), 2000);

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

    if (data?.type === "contacts_refresh") {
      console.log('[QA_NOTIF] silent push contacts_refresh → emitting DeviceEventEmitter');
      DeviceEventEmitter.emit('contacts:refresh');
      return;
    }

    if (data?.category === "sos_invite" || data?.category === "sos_rejected" || data?.category === "sos_contact_added") {
      console.log('[QA_NOTIF] skip toast for', data.category, '— handled by _layout.tsx');
      return;
    }

    console.log('[QA_NOTIF] foreground toast | title:', title ?? 'none', '| alertId:', data?.alertId ?? 'none');
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
