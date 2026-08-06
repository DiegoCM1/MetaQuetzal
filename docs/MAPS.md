# Maps — provider, keys, Google Cloud

Map code conventions live in `frontend/CLAUDE.md`. This file covers the cloud side.

## Provider

**Google Maps on both platforms** — every `<MapView>` passes `provider={PROVIDER_GOOGLE}`. Don't
switch iOS to Apple Maps: Android has no alternative provider (so a split means maintaining two
renderers), and `customMapStyle` — the dark brand palette in `app/map/mapStyle.ts` — is silently
ignored on Apple Maps.

## Keys

Live in the `react-native-maps` plugin entry in `frontend/app.json`. Not `ios.config`, not
`android.config`, not `eas.json` (they're native build config, not `EXPO_PUBLIC_*`).

⚠️ **Both keys are mandatory.** Omitting `androidGoogleMapsApiKey` makes the plugin *delete*
`com.google.android.geo.API_KEY` from the manifest and silently break the Android map.

**Public by design** — compiled into the shipped binaries and extractable from any APK/IPA. GitHub
secret scanning flags them on every change; close as *"Won't fix — client-embedded Maps keys."*
**Don't rotate**: keys are pinned in shipped builds, so rotating breaks the map for every user who
hasn't updated. Security comes from restrictions, not secrecy:

| Key | API scope | Caller restriction |
|---|---|---|
| Bluai iOS Maps | `maps-ios-backend` | bundle ID `com.bluai.app` |
| Bluai Android Maps | `maps-android-backend` | none — see Known gaps |

Both are $0-unlimited SKUs, so a stolen key costs nothing.

## Billing — required, but $0

Maps Platform rejects **all** requests without an enabled billing account
(`REQUEST_DENIED: "You must enable Billing"`). It's a gate, not a price: Maps SDK map loads on
iOS/Android are **unlimited and free** (SKU `6DE1-4D9C-5B67`). Don't migrate off Google to avoid a
bill that doesn't exist.

A GCP *budget* only alerts. A *spend cap* pauses services — scope one carefully, since
`blue-eye-4dbfc` also serves Firebase Auth and push.

## Projects

| Project | Holds |
|---|---|
| `blue-eye-4dbfc` | **Current.** Firebase Auth + push, **and** Maps SDK iOS/Android. Both current keys. |
| `blueye-app-466302` | **Legacy, retiring.** Old key (restricted to `maps-android-backend`), billing closed. |

**Don't delete `blueye-app-466302` yet.** Play Store builds ≤ `versionCode 14` embed the old key —
deleting it breaks the map for every user who hasn't updated. Retire only once its Maps API traffic
reads ~0 in Cloud Monitoring.

## Debugging

**iOS map blank / markers missing / `animateToRegion` does nothing** — the Google Maps SDK isn't in
the build. On iOS, `provider="google"` compiles to an *empty stub* when the SDK is absent: no error,
no tiles. Check `HAVE_GOOGLE_MAPS` in `node_modules/react-native-maps/ios/AirMaps/RNMapsDefines.h`
(want `1`). It's written by an Xcode build-phase script, so right after a prebuild it still shows
the previous build — check for `ios/Pods/GoogleMaps/` instead.

**Tiles stamped "For development purposes only"** — billing not enabled on the key's project.

**Map renders, no markers** — backend, not maps. Markers need auth.

A "Google" watermark bottom-left confirms Google Maps; Apple Maps never draws it.

## Building locally

`npx expo run:ios` can fail with `No code signing certificates are available` even for a
**simulator** (Expo CLI 54 misparses `devicectl` on Xcode 26). Build via Xcode or `xcodebuild` with
a simulator destination instead.

Don't work around it with `CODE_SIGNING_ALLOWED=NO` — that strips entitlements, and Google Sign-In
and expo-notifications then fail with *"Keychain access failed."* Use `CODE_SIGN_IDENTITY="-"`.

The simulator proves the SDK links and the map renders — not signing, entitlements, push, or
sign-in. Those need a physical device.

## Known gaps

- **Android key has no caller restriction.** Needs the EAS signing SHA-1; a wrong value silently
  breaks production, so do it as its own change. Exposure is quota, not money.
- **Weather tiles are dead on both platforms.** `EXPO_PUBLIC_OPENWEATHER_API_KEY` is defined
  nowhere, so all three `UrlTile` layers 401. The wind layer is on by default.
- **No marker clustering or bound.** `/api/v1/map-events` has no `LIMIT`; every event renders as an
  individual `<Marker>`. Fine today, no headroom during a dense-metro landfall.
