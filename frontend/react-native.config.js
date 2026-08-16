/**
 * Autolinking overrides for React Native CLI modules (i.e. non-Expo native deps).
 *
 * `@react-native-firebase/messaging` is iOS-only in this app.
 *
 * WHY: iOS needs an FCM *registration token*, and `expo-notifications`'
 * `getDevicePushTokenAsync()` returns the raw APNs device token there (64 hex) —
 * which the backend, sending via `firebase_admin.messaging`, cannot route. RNFB's
 * `getToken()` is what produces a real FCM token on iOS. Android already gets one
 * from expo-notifications and does not need this package at all.
 *
 * WHY DISABLING ANDROID IS NOT OPTIONAL: autolinking merges a package's
 * AndroidManifest.xml for every platform it supports, before any `Platform.OS`
 * branch exists. RNFB declares:
 *
 *   <service .ReactNativeFirebaseMessagingService>
 *     <intent-filter>  (no android:priority → 0)
 *       <action com.google.firebase.MESSAGING_EVENT/>
 *
 * while expo-notifications deliberately declares `android:priority="-1"` on both
 * its service and its receiver so it yields to any other FCM consumer. Android
 * resolves exactly one service for MESSAGING_EVENT (best match wins), so linking
 * RNFB on Android makes `ExpoFirebaseMessagingService` dead code — breaking
 * foreground push receipt (`app/_layout.tsx`, `utils/pushNotifications.ts`) on the
 * platform that is currently in production on Google Play.
 *
 * DO NOT add "@react-native-firebase/messaging" to app.json `plugins`. Its
 * config plugin is Android-only — the whole body is `withExpoPluginFirebaseNotification`
 * (plugin/build/index.js), which writes Firebase notification meta-data into
 * AndroidManifest.xml. It contributes NOTHING on iOS. Registering it would push
 * Android manifest entries for a package this file deliberately unlinks there.
 * iOS needs only the pod, which autolinking already provides.
 *
 * REMOVE THIS FILE WHEN: both platforms are unified on RNFB messaging and
 * expo-notifications no longer owns FCM delivery on Android. At that point the
 * conflict is the intended behavior, not a regression. Note that deleting this
 * file is NOT the whole migration — linking messaging on Android also collides on
 * `com.google.firebase.messaging.default_notification_color`, which both
 * expo-notifications' plugin and RNFB's manifest declare, without `tools:replace`
 * (invertase/react-native-firebase#8165). Budget for a manifest-merger fight.
 * See docs/IOS_RELEASE.md.
 */
module.exports = {
  dependencies: {
    "@react-native-firebase/messaging": {
      platforms: {
        android: null,
      },
    },
  },
};
