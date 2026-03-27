  Option A — Physical phone (EAS cloud build)
  eas build --profile development --platform android
  Builds remotely → downloads APK → install on your phone → test there.

  Option B — Emulator (local build)
  npx expo run:android
  Requires Android Studio with an emulator set up locally.