// frontend/utils/pushNotifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import { Alert, DeviceEventEmitter, Linking, Platform } from "react-native";
import { toast } from "sonner-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import { track } from "./analytics";
import { authFetch } from './api'
import { API_BASE_URL } from './config'
import {
  PUSH_FAILURE_COPY,
  classifyBackendStatus,
  pushBreadcrumb,
  redactToken,
  reportPushFailure,
  resetPushFailureReporting,
  toMessage,
  type PushFailureType,
} from './pushTelemetry'

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
    'Para que Bluai pueda avisarte aunque el teléfono esté inactivo, necesita permiso para funcionar en segundo plano sin restricciones.',
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

/** Outcome of a registration attempt, so callers can react instead of guessing. */
export type PushRegistrationResult =
  | { ok: true }
  | { ok: false; type: PushFailureType };

// Telemetry must never be the thing that crashes the app: if Firebase isn't
// initialised yet, "no uid" is the honest answer, not an exception.
function _hasUid(): boolean {
  try {
    return !!getAuth().currentUser?.uid;
  } catch {
    return false;
  }
}

export async function sendTokenToBackend(fcmToken: string): Promise<PushRegistrationResult> {
  // Another call already owns this token's outcome — not our failure to report.
  if (_registrationInFlight === fcmToken) return { ok: true };
  _registrationInFlight = fcmToken;  // set before any await — closes TOCTOU window

  const tokenPrefix = redactToken(fcmToken);
  let success = false;
  let failureType: PushFailureType = 'backend-unreachable';
  let lastMessage = '(no error object)';
  let lastStatus: number | undefined;
  let attempt = 0;

  try {
    // Persistent deduplication: skip if token already registered successfully
    try {
      const stored = await AsyncStorage.getItem(_LAST_TOKEN_KEY);
      if (stored === fcmToken) {
        pushBreadcrumb('token already registered — skipping POST', { tokenPrefix });
        return { ok: true };             // finally handles _registrationInFlight = null
      }
    } catch {
      // AsyncStorage unavailable — proceed with registration
    }

    const MAX = 3;
    for (let i = 0; i < MAX; i++) {
      attempt = i + 1;
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/push-token`, {
          method: 'POST',
          body: JSON.stringify({ token: fcmToken }),
        });
        if (res.ok) {
          try {
            await AsyncStorage.setItem(_LAST_TOKEN_KEY, fcmToken);
          } catch { /* best-effort; next launch will re-POST (idempotent) */ }
          track('push_token_saved', { ok: true });
          pushBreadcrumb('token registered with backend', { tokenPrefix, attempt });
          success = true;
          break;
        }
        // Record WHY before deciding whether to retry. Breaking out of the loop
        // without capturing the reason is what made 4xx failures invisible.
        lastStatus = res.status;
        failureType = classifyBackendStatus(res.status);
        lastMessage = `HTTP ${res.status}`;
        if (res.status < 500) break;                       // 4xx permanente — no reintentar
      } catch (err) {
        failureType = 'backend-unreachable';               // error de red → reintentar
        lastMessage = toMessage(err);
        lastStatus = undefined;
      }
      if (i < MAX - 1) await new Promise(r => setTimeout(r, 1000 * 2 ** i)); // 1s → 2s
    }
  } finally {
    _registrationInFlight = null;
  }

  if (success) return { ok: true };

  reportPushFailure(
    { type: failureType, message: lastMessage, phase: 'backend' },
    { hasUid: _hasUid(), attempt, httpStatus: lastStatus, tokenPrefix },
  );
  track('push_token_saved', { ok: false, error: failureType });

  // Whether to interrupt the user is a per-failure decision, not an inference
  // from whether an error object happens to exist.
  const copy = PUSH_FAILURE_COPY[failureType];
  if (copy.notify) {
    toast.error(copy.title, { description: copy.description });
  }
  return { ok: false, type: failureType };
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
  // Invite / reject / contact-added pushes declare this channel id backend-side
  // (sos_contacts/service.py, sos_invite/service.py) but it was never created
  // here — Android silently fell back to its default channel (no heads-up, no
  // guaranteed sound) for all three, making a successfully-sent invite push
  // easy to miss entirely. HIGH (not MAX/bypassDnd) — important, but not the
  // "someone needs help right now" signal that sos_emergency is.
  await Notifications.setNotificationChannelAsync("sos_alerts", {
    name: "Contactos SOS",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
    sound: "default",
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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
  resetPushFailureReporting();

  if (!Device.isDevice) {
    pushBreadcrumb('skipped — push requires a physical device');
    return null;
  }

  // A failed channel must not cost us the token. This used to be a bare `await`:
  // any throw rejected the whole function, so permissions were never requested
  // and no token was ever fetched — with nothing but a console line to show it.
  try {
    await setupNotificationChannels();
  } catch (err) {
    reportPushFailure(
      { type: 'channel-setup-failed', message: toMessage(err), phase: 'channels' },
      { hasUid: _hasUid() },
    );
  }

  // 1) Permisos
  let finalStatus: string;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus =
      existingStatus === "granted"
        ? existingStatus
        : (await Notifications.requestPermissionsAsync()).status;
  } catch (err) {
    reportPushFailure(
      { type: 'unknown', message: toMessage(err), phase: 'permissions' },
      { hasUid: _hasUid() },
    );
    return null;
  }

  track("push_permission", {
    status: finalStatus === "granted" ? "granted" : "denied",
  });

  if (finalStatus !== "granted") {
    // A declined permission is a user choice, not a defect — it belongs in the
    // Mixpanel funnel above, not in Sentry's "something is broken" dashboard.
    const copy = PUSH_FAILURE_COPY['permission-denied'];
    pushBreadcrumb('permission denied by user', { status: finalStatus });
    Alert.alert(copy.title, copy.description);
    return null;
  }

  // 2) Token nativo FCM (HTTP v1)
  let fcmToken: string;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    fcmToken = data;
  } catch (err) {
    reportPushFailure(
      { type: 'token-unavailable', message: toMessage(err), phase: 'token' },
      { hasUid: _hasUid() },
    );
    return null;
  }
  // Prefix only — a push token is a credential, and Sentry runs sendDefaultPii.
  pushBreadcrumb('FCM token acquired', { tokenPrefix: redactToken(fcmToken) });

  await sendTokenToBackend(fcmToken);

  // 3) Battery optimization exemption — solo aparece una vez
  void requestBatteryOptimizationExemption().catch((err) =>
    pushBreadcrumb('battery-opt dialog failed', { error: toMessage(err) }),
  );
  // 4) Heads-up / floating notifications — mostramos 2 s después para no superponer dialogs
  setTimeout(() => {
    void requestHeadsUpPermission().catch((err) =>
      pushBreadcrumb('heads-up dialog failed', { error: toMessage(err) }),
    );
  }, 2000);

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

    if (data?.category === "sos" || data?.category === "sos_invite" || data?.category === "sos_rejected" || data?.category === "sos_contact_added") {
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
