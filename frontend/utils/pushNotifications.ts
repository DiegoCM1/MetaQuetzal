// frontend/utils/pushNotifications.js
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import { track } from "./analytics";
import { authFetch } from './api'
import { API_BASE_URL } from './config'


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

  try {
    await authFetch(
      `${API_BASE_URL}/api/push-token`,
      {
        method: "POST",
        body: JSON.stringify({ token: fcmToken }),
      },
    );
    console.log("Token enviado al backend (frontend)");
    track("push_token_saved", { ok: true });
  } catch (error) {
    console.error("Error enviando token al backend:", error);
    track("push_token_saved", {
      ok: false,
      error: String(error?.message || error),
    });
  }
  // TODO: envíalo a tu backend
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
    Toast.show({ text1: title, text2: body });
    track("push_received_foreground", {
      alertId: data?.alertId ? String(data.alertId) : undefined,
    });
  });
}

// Devuelve el unsubscribe para limpiarlo en unuseEffect
export function addNotificationResponseListener(onTap: (data: Record<string, unknown>) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    onTap(data); // envía los datos al callback que definas en el layout
  });
}
