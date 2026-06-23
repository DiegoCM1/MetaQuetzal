# Sprint 3 — Diego

**22 jun → 7 jul 2026**

Spec técnico detallado de tu sprint. Eje principal: **iOS → producción (submission a App Store)** (Bloques 1-4). Además, dos cargas cross-cutting (no-iOS): **bugs multi-plataforma** (Bloque 5) y **tools para el agente de IA** (Bloque 6). Para coordinación general (checkpoints, cut criteria, seams) → `sprint.md`.

> **Decisiones de este workstream (tomadas en planeación):**
> - **Techo: submission completa a App Store** — build → TestFlight → submit a review de Apple. DoD = *enviado a review*; aceptación de Apple NO es parte del DoD (puede tomar días/iteraciones).
> - **Acceso Apple: Diego autónomo** — certs, profiles, App IDs y submit sin depender de nadie (acceso al Apple Developer Program resuelto).
> - **Pipeline: EAS Build + EAS Submit** — mismo flujo que Android, credenciales manejadas por EAS.
> - **Paridad mínima para DoD:** Push (APNs) · Maps + SOS + Auth · **BT 1-a-1 en iOS funcional** (MultipeerConnectivity, no mesh). **AI on-device NO es must-have** en iOS este sprint.

---

## Feature — iOS a producción (P0)

### Goal

Llevar la app de iOS de **"corre en Simulator dev"** a **"enviada a review de App Store"**, con **paridad funcional vs Android** en el core: notificaciones push, mapas, SOS, login. La app de iOS es además un **desbloqueador pasivo de pagos** — **sin UI de compra** (seam #1).

El entregable no es "Apple lo aceptó" (eso no lo controlamos) — es **"el build firmado, con push funcionando en device físico, está subido y enviado a review en App Store Connect."**

### Context

**Lo que ya existe (verificado en código/config):**
- `app.json`: `bundleIdentifier = com.bluai.app`, `usesAppleSignIn: true`, `ITSAppUsesNonExemptEncryption: false`, `GoogleService-Info.plist` presente (Firebase iOS para Auth wired).
- `eas.json`: perfiles `development`/`preview`/`production`; **`submit.production.ios.ascAppId = 6771983891`** ya configurado (target de EAS Submit existe).
- `expo-build-properties` con `useFrameworks: "static"` + `forceStaticLinking: ["RNFBApp", "RNFBAuth"]` (workaround SDK 54 / expo#39607).
- `ios/` está **gitignored** — generado por `expo prebuild`. EAS Build corre prebuild en la nube; **ediciones manuales a `ios/` no persisten** (misma trampa que `android/`).
- **Backend de push ya es iOS-ready:** `firebase_admin.messaging.MulticastMessage` con `apns=APNSConfig(...)` en `siat/service.py`, `sos_trigger/service.py`, `sos_invite/service.py`. El backend **no se toca** para push iOS.
- Plugin `with-nearby-connections.js` es **Android-only** (solo `withAndroidManifest` + Kotlin + gradle; cero `modResults` de iOS). En iOS `NativeModules.NearbyConnections` es `undefined` → el stub `NearbyTransport.ios.ts` reporta `isAvailable: false`. **Nearby degrada limpio en iOS por construcción.**

**Lo que falta (los 4 bloques):**
1. **Signing & pipeline** (EAS Build + EAS Submit) — cert/profile + `.ipa` firmado.
2. **Push iOS / APNs** — el cliente registra el **token equivocado** en iOS; el pipeline de push está roto hoy. **El bloque más grande y de mayor riesgo de correctness.**
3. **Build firmado + paridad funcional** en device físico iOS.
4. **Submission a App Store** (TestFlight → metadata → review).

---

## Bloque 1 — Signing & pipeline (EAS Build + EAS Submit)

**Credenciales manejadas por EAS** (no manuales en Xcode). EAS guarda Distribution Certificate + Provisioning Profile en su servidor.

1. **Distribution cert + provisioning profile** para `com.bluai.app` — EAS los genera/gestiona en el primer `eas build --profile production`.
2. **App Store Connect API Key** ya existe y funciona para submit (`Key ID N3M5RJLBGQ`, Issuer `f2ad728e-...`). EAS Submit la usa; `ascAppId 6771983891` ya está en `eas.json`.
3. **`ios/` es generado** — todo cambio nativo va por `app.json` / config plugins / `expo-build-properties`, nunca editando `ios/` a mano (se borra en prebuild).
4. **Valida con Context7 los comandos/flags actuales de EAS CLI** (`eas build`, `eas submit`, manejo de credenciales) antes de correr — la CLI cambia entre versiones.

**DoD del bloque:** `eas build --platform ios --profile production` produce un `.ipa` firmado, y `eas submit --platform ios --profile production` lo sube a App Store Connect.

---

## Bloque 2 — Push iOS / APNs 🔴 (el más grande — mayor riesgo de correctness)

**El backend ya manda bien** (FCM con `apns=APNSConfig`). El problema está **100% en el cliente y la config de Firebase.**

### El bug de fondo (entiéndelo antes de tocar nada)

`utils/pushNotifications.ts` registra el token así:

```ts
const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();  // ← línea 203
```

- En **Android**, `getDevicePushTokenAsync()` regresa un **token FCM** → el backend (que manda por FCM) lo entrega. ✅
- En **iOS**, ese mismo call regresa un **token APNs crudo**, **NO** un token FCM. El backend manda con `messaging.MulticastMessage`, que **exige tokens de registro FCM**. Mandar un FCM message a un token APNs crudo **falla**. ❌

**Resultado:** hoy iOS registraría un token que el backend no puede usar. Push iOS está roto end-to-end aunque el backend "ya soporte APNs".

### Lo que hay que hacer (en orden)

1. **Agregar `@react-native-firebase/messaging`** (hoy solo están `/app` y `/auth`). Es lo que da `messaging().getToken()` → el **token FCM real de iOS** (FCM hace el bridge FCM→APNs internamente).
2. **Branch por plataforma en `pushNotifications.ts`:** en iOS, obtener el token vía `@react-native-firebase/messaging` (`getToken()` tras registrar el device para remote messages); en Android, mantener `getDevicePushTokenAsync()` (ya funciona). El resto (`sendTokenToBackend`, retries, dedup) **no cambia** — el backend recibe un token FCM en ambos casos.
3. **Subir el APNs Auth Key (`.p8`) a Firebase Console** → Project Settings → Cloud Messaging → APNs. **Sin esto FCM no puede entregar a APNs**, sin importar qué token registres. La `.p8` se genera en `developer.apple.com`. Un solo Auth Key sirve para todos los bundle IDs del team.
4. **`forceStaticLinking`**: agregar `"RNFBMessaging"` a la lista en `app.json` (junto a `RNFBApp`/`RNFBAuth`) — mismo workaround SDK 54 que ya aplica a los otros módulos Firebase.
5. **Capability Push Notifications + entitlement `aps-environment`**: EAS lo maneja vía managed credentials cuando la capability está habilitada en el App ID. Verifica que el provisioning profile la incluya.

### Cleanup mientras estás ahí
- `app.json` línea 31-34: `UIBackgroundModes` tiene **`remote-notification` duplicado**. Déjalo una sola vez.

### Cómo lo pruebas (no es opcional — push solo corre en device físico, ver `pushNotifications.ts:176`)
- Device iOS físico → permiso concedido → token FCM registrado en backend.
- Disparar un push real (SOS / alerta SIAT desde el backend) → **llega al iPhone** con la app en background y cerrada.

**DoD del bloque:** push real del backend llega a un iPhone físico (background + cerrado), vía el mismo `/push-token` y el mismo `messaging.send_each_for_multicast` que Android.

---

## Bloque 3 — Paridad funcional en device físico iOS

Verificar (y arreglar lo que rompa) el core en un iPhone físico, no Simulator:

1. **Auth (Firebase + Google + Apple Sign In).** `usesAppleSignIn: true` ya está. ⚠️ **Apple Guideline 4.8:** si ofreces login de terceros (Google), Apple **exige** "Sign in with Apple" funcional — su ausencia/rotura es **rechazo de review**. Capability + entitlement + flujo probado en device.
2. **Maps (`react-native-maps`).** En iOS usa **Apple Maps** por default (no Google) salvo config explícita. Verifica que mapas/markers/SOS-map rendericen en device. (El API key de Google Maps en `app.json` es solo Android.)
3. **SOS end-to-end** (receiver screen, emergency push, map flow) en iOS.
4. **BT 1-a-1 funcional en iOS (local-chat) — construir, NO solo degradar.** Hoy `NearbyTransport.ios.ts` es un stub (`isAvailable:false`). Implementar el transporte iOS real detrás de la interfaz `LocalTransport` ya existente (advertise/discover/connect/send/subscribe) con **MultipeerConnectivity** (Swift), para chat **1-a-1**. La interfaz ya es agnóstica de plataforma (`transport.ts` lo dice) → la UI no cambia. **Solo 1-a-1; la mesh multi-salto en iOS queda fuera (Sprint futuro).** Valida con Context7 si hay una lib RN mantenida de MultipeerConnectivity o si se hace módulo nativo propio.
5. **Pagos = silencio (seam #1).** iOS **sin** botón de compra, **sin** precio, **sin** link a la web. Solo lee entitlement y desbloquea. (El gating lo construye Edgar; tú verificas que iOS no muestre nada de compra.)

**DoD del bloque:** un iPhone físico arranca la app, hace login (incl. Apple), ve mapas/SOS, recibe push, y **dos iPhones chatean 1-a-1 por BT (local-chat)** — sin UI de compra en ninguna pantalla.

---

## Bloque 4 — Submission a App Store

1. **Build de producción a TestFlight** vía EAS (`eas build` + `eas submit`). Procesar en App Store Connect, instalar vía TestFlight en device, smoke test.
2. **Metadata de la ficha** (App Store Connect, app `6771983891`): descripción, screenshots iOS, política de privacidad, categoría, age rating, **App Privacy / data collection** (push, ubicación, contactos — declarar lo que la app usa).
3. **Export compliance:** `ITSAppUsesNonExemptEncryption: false` ya puesto → evita el prompt de cifrado. ✅
4. **Anti-steering (Guideline 3.1.1):** confirmar que iOS no insinúa compra externa — alineado con seam #1. Es el motivo de "modelo Spotify"; romperlo aquí = rechazo.
5. **Submit a review.** Ese es el DoD del sprint para iOS.

**Riesgos de rechazo a vigilar (no bloquean el DoD "enviado", pero anticípalos):** falta de Sign in with Apple (4.8), privacy labels incompletos, permisos sin descripción de uso (`infoPlist` usage strings para ubicación/contactos/notificaciones).

---

## Bloque 5 — Bugs multi-plataforma

Dueño del pool de bugs que **cruzan iOS + Android** (no solo tu área iOS): los que viven en el código compartido (JS/React Native, backend) o aparecen en ambas plataformas. Eres el dueño natural porque eres el único que compila y prueba **las dos**.

- Lista viva priorizada por severidad; **P0** (crashes, SOS/push roto, login roto) primero.
- Cada fix: reproducir en device físico → fix → **verificar en iOS Y Android** (un cambio de RN puede arreglar uno y romper el otro — ese es justo el riesgo cross-platform).
- Bugs de un área específica siguen siendo de su dueño (pagos → Edgar, mesh → Val); tú tomas los **transversales** y los de plataforma.

**DoD del bloque:** sin P0 cross-platform abiertos al cierre; cada fix verificado en ambas plataformas.

---

## Bloque 6 — AI agent: tool use (web search, hora/timezone, …)

Hoy el agente de IA online (`backend/app/features/ai/service.py`) es un **chat sin herramientas**: llama un endpoint **OpenAI-compatible** (`{LLM_BASE_URL}/chat/completions`) y devuelve texto. **No tiene function/tool calling.** Eso le da dos límites duros que importan en una app de huracanes:
- **No sabe la hora actual** → no puede responder "¿a qué hora llega el ciclón en mi zona?" con precisión temporal.
- **No tiene info en vivo** → su conocimiento es estático; no consulta boletines ni noticias actuales.

**Construir la capa agéntica (tool-calling loop) sobre el provider online:**

1. **Loop de herramientas** en `ai/service.py`: pasar `tools` en la request → si el modelo emite un `tool_call`, el backend **ejecuta** la herramienta → re-inyecta el resultado → el modelo continúa hasta la respuesta final. Con **tope de iteraciones** (evita loops infinitos de tool calls) + manejo de error por herramienta.
2. **Herramientas iniciales:**
   - **`get_current_time(timezone)`** — la más barata y de mayor impacto; los LLM no saben la hora. Crítica para "¿cuánto falta para…?".
   - **`web_search(query)`** — info en vivo (boletines oficiales, noticias del ciclón). Requiere un proveedor de búsqueda (API key en `backend/.env`, gitignored).
   - **(candidatas — reusar lo que ya hay):** `get_cyclone_status` / `get_active_alerts` — el backend **ya tiene datos SIAT de ciclones**; exponerlos como tool da contexto real **sin** servicio externo. `geocode(place)` para resolver lugares → coordenadas.
3. **Streaming + tools:** el service hoy stremea texto; el tool-calling intercala un turno no-streaming (el `tool_call`) antes de streamear la respuesta final. Maneja la transición — **valida la forma exacta con Context7** (la API de tools cambia entre versiones/proveedores OpenAI-compatible).
4. **Solo provider online.** El on-device (LLaMA executorch) **no** entra — tool use ahí es mucho más caro → out of scope.
5. **Frontend (opcional, ligero):** la UI de chat puede mostrar "buscando…/consultando hora…" cuando el agente usa una herramienta. No bloqueante.

**DoD del bloque:** el agente online responde una pregunta que **exige** una herramienta — p.ej. "¿qué hora es en CDMX y cuándo es el próximo boletín?" usa `get_current_time` (+ `web_search`/`get_cyclone_status`) y responde con datos en vivo, no inventados. Tope de iteraciones aplicado; tool calls logueados.

---

## Verificación / "tests"

iOS no tiene unit tests aquí; la verificación es **en device físico** (igual que el resto del frontend — no hay CI de frontend). Checklist objetivo:
- `eas build --platform ios --profile production` → `.ipa` firmado (Bloque 1).
- Push real del backend → llega a iPhone físico en background/cerrado (Bloque 2).
- Login (Google **y** Apple), mapas, SOS, local-chat-no-crashea en device (Bloque 3).
- Build en TestFlight instalable + enviado a review (Bloque 4).

---

## Estrategia de PRs (≤ 400 líneas cada uno)

1. **Push iOS** — `@react-native-firebase/messaging` + branch de token por plataforma en `pushNotifications.ts` + `RNFBMessaging` en `forceStaticLinking` + dedupe `UIBackgroundModes`. *(El cambio de código más sustancial; el resto es config/credenciales/portal.)*
2. **iOS config & capabilities** — ajustes de `app.json`/plugins para Apple Sign In capability, push entitlement, cualquier `infoPlist` usage string faltante.
3. **Fixes de paridad** — lo que rompa en device (maps/SOS/auth) en PRs chicos y enfocados.
4. **BT 1-a-1 en iOS** — transporte MultipeerConnectivity (Swift) detrás de la interfaz `LocalTransport`, reemplazando el stub en `NearbyTransport.ios.ts`. Solo 1-a-1, no mesh. Diego revisa (nativo).

> Subir el `.p8` a Firebase, generar certs/profiles, metadata de la ficha y submit **no son PRs** (son acciones en consolas Apple/Firebase/EAS) — van documentadas en el DoD, no en el repo.

---

## DoD

- [ ] `eas build --platform ios --profile production` produce `.ipa` firmado
- [ ] `@react-native-firebase/messaging` agregado; iOS registra **token FCM** (no APNs crudo)
- [ ] APNs Auth Key (`.p8`) subida a Firebase Console (Cloud Messaging)
- [ ] `RNFBMessaging` en `forceStaticLinking`; `UIBackgroundModes` sin duplicado
- [ ] **Push real del backend llega a iPhone físico** (background + cerrado), mismo `/push-token`
- [ ] Login en iOS: Firebase + Google + **Sign in with Apple** funcional (Guideline 4.8)
- [ ] Maps + SOS funcionan en iPhone físico
- [ ] **BT 1-a-1 (local-chat) funcional en iOS** vía MultipeerConnectivity (no mesh) — dos iPhones chatean 1-a-1
- [ ] **iOS sin UI de compra** (sin botón, precio ni link) — seam #1 / Guideline 3.1.1
- [ ] Build en TestFlight, instalable en device, smoke test OK
- [ ] Metadata + App Privacy + export compliance completos en App Store Connect
- [ ] **Build enviado a review en App Store Connect** ← DoD del sprint (iOS)
- [ ] **Bugs cross-platform:** sin P0 abiertos; cada fix verificado en iOS **y** Android
- [ ] **AI agent:** tool-calling loop en `ai/service.py` con ≥2 tools (`get_current_time` + `web_search`), tope de iteraciones; demo de una respuesta que exige tool
- [ ] PRs ≤ 400 líneas

---

## Out of Scope (este sprint)

- **Aceptación de Apple.** El DoD es *enviado a review*, no *aprobado*. Iteraciones de rechazo viven fuera de la ventana.
- **AI on-device en iOS** (`react-native-executorch`/LLaMA). No es paridad must-have; el online AI cubre el caso. Validar executorch en iOS = fast-follow.
- **Tool use en el provider on-device (LLaMA).** Las tools del agente (Bloque 6) son **solo del provider online** este sprint.
- **iOS mesh (multi-salto)** — solo el **1-a-1** entra en iOS este sprint; la mesh multi-salto en iOS es Sprint futuro.
- **UI de compra / IAP / StoreKit en iOS** — modelo Spotify lo evita (seam #1).
- **iPad-specific polish** — `supportsTablet: true` está, pero no es foco.
- **Optimización de tamaño de build / app thinning avanzado.**

---

## Capacidad — mira la math antes de empezar

Full-time, ~10 días hábiles. Esto es **integración + config + portal**, no feature nueva grande — el riesgo está en lo nativo y las consolas externas, no en líneas de código.

- Bloque 1 (signing + pipeline EAS): ~1-2 días (mayormente esperar builds)
- Bloque 2 (push iOS / APNs): ~2-3 días — *el de mayor riesgo de correctness*
- Bloque 3 (paridad en device + **BT 1-a-1 iOS / MultipeerConnectivity**): ~3-4 días — *el 1-a-1 iOS es trabajo nativo nuevo (Swift), no solo verificación; el segundo chunk de código más grande tras push*
- Bloque 4 (submission + metadata + review): ~1-2 días
- Bloque 5 (bugs cross-platform): ~2-3 días — *continuo, en paralelo todo el sprint*
- Bloque 6 (AI agent tools): ~3-4 días — *backend agéntico nuevo (loop + 2-3 tools + proveedor de web search)*

> **⚠️ Realidad de capacidad — esto está sobre-suscrito.** Suma ~12-19 días de trabajo en un sprint de ~10 días hábiles, incluso full-time. Las cuatro cosas no caben las cuatro completas. **Prioridad cruda:** (1) iOS submission (Bloques 1-4) es el P0 del sprint — no se mueve. (2) Bugs cross-platform corren en paralelo (no son opcionales: P0 de crashes primero). (3) **AI agent tools (Bloque 6) es lo más cortable** — si iOS pelea, esto se difiere a fast-follow sin romper el sprint. Decide el alcance de Bloque 6 (¿solo `get_current_time`? ¿+web_search?) según cómo venga iOS a mid-sprint; no lo absorbas en silencio.

**El riesgo real (no de código):**
- **Push iOS end-to-end** — el branch de token + la `.p8` en Firebase + el entitlement tienen que alinearse los tres; si uno falla, el push "no llega" sin error claro. Testéalo temprano en device, no el último día.

Además eres **reviewer de los PRs de Edgar y Val** (auth/DB/nativo) — reserva banda para los turnaround de 24h. Con esta carga, eres tú quien más probable se sobre-extiende; dilo en el grupo apenas pase.
