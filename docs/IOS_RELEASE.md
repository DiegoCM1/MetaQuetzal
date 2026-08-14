# iOS Release — estado y pendientes

Estado al **13 de agosto de 2026**. Este doc es la fuente de verdad de qué falta para
publicar Bluai en la App Store. Android ya está en Play Store; iOS nunca se ha publicado.

**Alcance de este release:** Bluetooth (chat local) y la IA offline **NO salen en iOS**.
Paridad iOS/Android es objetivo de un release posterior.

---

## SACRED RULE de este release

**El fix de push en iOS no está terminado hasta que un push llegue a un build de
TestFlight — no a un dev client.**

El dev client y TestFlight hablan con *gateways distintos* de Apple (sandbox vs
producción). Un push que funciona en tu iPhone conectado a Metro no prueba nada sobre
lo que verá un usuario real. Ver "Gotchas → `aps-environment`" abajo.

---

## Ya hecho (commiteado)

| Área | Cambio |
|---|---|
| Telemetría push | `frontend/utils/pushTelemetry.ts` — taxonomía de fallos, Sentry, dedupe, `redactToken()` |
| Push error handling | `pushNotifications.ts` — se arregló el hueco de 4xx (`lastErr` sin asignar), el `await setupNotificationChannels()` sin proteger, y se migró a `/api/v1/push-token` |
| Config iOS | `supportsTablet: false`, `UIBackgroundModes` sin duplicado, `ios.buildNumber: "15"` |
| executorch en iOS | Card de IA offline oculta en `SettingsScreen.tsx`; copy del tour y de `useChat` ya no manda a iPhone a Ajustes |
| Chat local en iOS | `local-chat/index.tsx` muestra "Próximamente en iPhone" en vez de un error rojo "Algo falló" |
| Permisos iOS | Se eliminaron `expo-camera`, `expo-image-picker`, `expo-audio` (0 imports) → se van 3 purpose strings falsos. Location con string en español |
| Marca | Todo el copy visible dice **Bluai** (ya no "BluEye") |

Verificado en Pixel 7: el happy path de push, el path de fallo (Sentry + toast + 3
reintentos), y la carrera del 404 (no se dispara — `upsertUserProfile` gana con holgura).

---

## Falta — código, nada bloqueado

### A. Fase 2 — token de push en iOS ← **el bloqueador real**

`getDevicePushTokenAsync()` devuelve el token **crudo de APNs** en iOS (64 hex). El
backend manda por FCM, que necesita un **registration token** de FCM (~140-180 chars).

- Instalar `@react-native-firebase/messaging@24.0.0` **exacto** (ver Gotchas)
- Branch por plataforma: `registerDeviceForRemoteMessages()` → `getToken()`
- Rotación en iOS con `onTokenRefresh` (en Android se queda `addPushTokenListener`)
- Agregar `"RNFBMessaging"` a `forceStaticLinking` en `app.json`

### B. Fase 3 — presentación en primer plano (iOS)

`pushNotifications.ts:321-325` — `setNotificationHandler` regresa **todo en false**.
Android se salva por los canales en `IMPORTANCE_MAX`; **iOS lo respeta al pie de la
letra**. Aunque el token se arregle, una alerta en primer plano no se ve.

### C. Fase 4 — config APNs en backend

Cuatro sends sin bloque `apns=`:

| Archivo | Qué es |
|---|---|
| `notifications/service.py:80` | targeted — **es el endpoint con el que vas a probar iOS** |
| `notifications/service.py:109` | contacts refresh — necesita `content-available: 1` o el push silencioso **nunca despierta la app en iOS** |
| `notifications/service.py:141` | broadcast |
| `sos_invite/service.py:120` | invitación SOS |

`siat/service.py:408` y `sos_trigger/service.py:102` **ya tienen** `apns=`. Copiar ese
patrón, no inventar uno nuevo.

### D. `aps-environment`

`app.json` tiene `"expo-notifications"` pelón, sin opciones → el plugin default a
`mode: 'development'`. Ver Gotchas.

---

## Falta — no es de iOS, pero iOS lo empeora

### E. Corte de 500 + predicado de borrado ← **campaña el lunes 17**

- `siat/service.py:390` aplana **todos** los tokens en un solo `MulticastMessage`.
  Firebase truena arriba de 500 (`ValueError`, antes de cualquier llamada de red) →
  **la alerta nacional no le llega a nadie**.
- `notifications/service.py:92` y `:153` borran el token ante **cualquier** fallo.
  Debe ser solo `isinstance(r.exception, messaging.UnregisteredError)`. Hoy un
  `QuotaExceededError` transitorio borra permanentemente un dispositivo bueno.

**Por qué importa para iOS:** en cuanto entren tokens de iOS, cualquier problema de
APNs regresa fallos por-token, y este código responde **borrando esos dispositivos de
la base**. Se registran, fallan, se borran, se re-registran — en loop invisible.

### F. Borrado de cuenta (Guideline 5.1.1(v))

`users/router.py:70-84` borra solo el usuario de Firebase; deja viva la fila en `users`
y por lo tanto sus `device_tokens` → **un usuario borrado sigue recibiendo alertas**.
Hay un `TODO` en el código reconociéndolo.

Y el cliente tiene tres problemas en la misma función (`AuthContext.tsx:186-200`):

1. Pega a `/users/account` — que en el backend es `@router.delete("/users/account", deprecated=True)`
   (`users/router.py:89`). El vigente es `/api/v1/users/me` (`:70`). Si el alias se
   quita antes de que salga el build de iOS, **borrar cuenta regresa 404 → rechazo
   garantizado** por Guideline 5.1.1(v).
2. Usa `fetch` a pelo armando el header `Authorization` a mano, en vez de `authFetch`
   (`utils/api.ts`) — contra la convención de `frontend/CLAUDE.md`.
3. Lee `process.env.EXPO_PUBLIC_API_URL` directo en vez de importar `API_BASE_URL`
   (`utils/config.ts`) — misma convención, explícitamente prohibido ahí.

---

## Bloqueado en Ivan (Account Holder)

Mandar **todo junto**, no de uno en uno:

1. **APNs Auth Key `.p8`** (uno solo sirve para Sandbox + Production) + su Key ID.
   Team ID ya lo tenemos: `M5CJDZ3897`.
2. **Estado de Agreements, Tax and Banking.** Solo el Account Holder los acepta, y un
   agreement pendiente **bloquea cualquier submission** con un error que no lo dice.
3. **Capabilities** en el App ID `com.bluai.app`: Push Notifications y Sign in with Apple.
4. **"Access to Certificates, Identifiers & Profiles"** para `blueyehurricanealerts@gmail.com`
   — es un checkbox *aparte* del rol de Admin; por eso developer.apple.com muestra
   "Enroll today".

---

## Gotchas — las cosas que fallan en silencio

### `@react-native-firebase/messaging` va pineado exacto

`messaging@24.0.0` declara `peerDependencies: { "@react-native-firebase/app": "24.0.0" }`
— pin exacto, no rango. Instalado hoy: exactamente `24.0.0`. ✅

**El problema:** los tres perfiles de `eas.json` traen `NPM_CONFIG_LEGACY_PEER_DEPS: "1"`,
que le dice a npm que ignore conflictos de peers. Un par desalineado **no truena al
instalar ni al buildear** — truena en runtime, en un dispositivo, sin señal en compilación.

→ Instalar con `--save-exact`. Nunca con caret.

### `aps-environment`: push que sirve en tu escritorio y está muerto en producción

El entitlement decide con qué gateway de Apple habla la app: `development` → **sandbox**;
`production` → el gateway real. Son sistemas separados, con tokens separados. Un token
de sandbox no significa nada para producción.

El plugin de expo-notifications default a `'development'`. EAS *normalmente* lo reconcilia
contra el provisioning profile al firmar — por eso casi nadie lo nota. Cuando no lo hace:
funciona en dev client, funciona sideloaded, **y no entrega nada en TestFlight ni en la
App Store**, sin error en ningún lado.

→ Por eso la prueba de entrega tiene que ser en **TestFlight**, no en dev client.

### El oráculo de una línea para saber si Fase 2 funcionó

`redactToken()` imprime prefijo + longitud. En el primer log de un build de iOS:

- `…(64)` y todo hex → sigue siendo el token crudo de APNs → **no está arreglado**
- `…(140+)` con mayúsculas/minúsculas y `:` o `-` → registration token de FCM → **sí**

No hace falta mandar ningún push para saberlo.

### `frontend/ios/` es artefacto, no fuente

Está en `.gitignore` y lo genera prebuild (CNG). El `Info.plist` que ves en disco
describe la config de *cuando corrió prebuild la última vez*, no la de hoy.

- La pregunta es `app.json`; `ios/` es una respuesta cacheada.
- Para ver qué produciría la config **sin generar nada**: `npx expo config --type introspect`.

### El `.p8` NO bloquea el trabajo de cliente de Fase 2

Son dos mecanismos distintos:

- **Registro con APNs** (app ↔ Apple) solo necesita el entitlement y un provisioning
  profile. Eso es lo que produce el device token que `getToken()` requiere.
- **El `.p8`** es cómo *los servidores de Firebase* se autentican ante Apple **al enviar**.
  Se valida al enviar, no al registrar.

→ Se puede buildear, correr y leer la longitud del token **antes** de que llegue la key.

---

## Evidencia — lo que ya está probado (no volver a dudarlo)

**Tres builds de iOS terminaron OK el 21/05/2026** (`eas build:list --platform ios`),
un mes después de que executorch entrara al repo (04/04/2026) y de que `initExecutorch`
llegara a `_layout.tsx` (21/04/2026). El commit `2cff22a` traía el **mismo**
`expo-build-properties` que hoy: `useFrameworks: "static"` + `forceStaticLinking`.

Por lo tanto, y contra lo que dice el README de executorch (`* iOS 17.0`):

- ✅ Compila y linkea con `deploymentTarget` en 15.1 — **no hace falta subirlo a 17.0**
- ✅ `initExecutorch()` corre en iOS sin tronar
- ✅ `useLLM({ preventLoad: true })` corre en cada render sin tronar
- ✅ `useFrameworks: "static"` + el xcframework vendored de executorch conviven

**Lo que esa evidencia NO cubre:** descargar el `.pte`, cargarlo a RAM y correr
inferencia. Nadie hizo opt-in, así que `preventLoad` siempre fue `true`. Por eso ocultar
el botón en Ajustes es la solución correcta y no un parche: garantiza que ese camino
siga sin ejecutarse.

**Consecuencia útil:** hay una baseline sana del toolchain de iOS. Si el build de Fase 2
falla, es culpa de Fase 2 — no de algo preexistente.

---

## Orden sugerido

```
A (token) → D (aps-environment) → C (apns backend) → B (foreground)
```
Esa es la cadena de "push funciona en iOS". Solo el test final de entrega necesita a Ivan.

**E va aparte y tiene fecha** (campaña lunes 17). **F lo empuja el store review.**

Antes de decidir urgencia de E, correr en **prod**:
```sql
SELECT COUNT(*) FROM device_tokens;
```
