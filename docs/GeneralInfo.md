  Option A — Physical phone (EAS cloud build)
  1. npm install -g eas-cli                                                                                                    
  2. eas build --profile development --platform android
  3. Builds remotely → downloads APK → install on your phone → test there.

  Option B — Emulator (local build)
  1. npx expo run:android
  2. Requires Android Studio with an emulator set up locally.