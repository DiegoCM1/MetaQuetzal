# iOS Release — estado y pendientes

Estado al **14 de agosto de 2026**. Este doc es la fuente de verdad de qué falta para
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
| APNs keys | Las dos auth keys verificadas (`Services: APNs`) y subidas a Firebase: dev `7MTNJ97RXH`, prod `2R524J3M7P`, team `M5CJDZ3897`. El `.p8` **no** vive en el repo |

Verificado en Pixel 7: el happy path de push, el path de fallo (Sentry + toast + 3
reintentos), y la carrera del 404 (no se dispara — `upsertUserProfile` gana con holgura).

---

## Falta — código, nada bloqueado

### A. Fase 2 — token de push en iOS ← **el bloqueador real**

`getDevicePushTokenAsync()` devuelve el token **crudo de APNs** en iOS (64 hex). El
backend manda por FCM, que necesita un **registration token** de FCM (~140-180 chars).

1. Instalar `messaging@24.0.0` con `--save-exact`, **y re-pinear `app` y `auth`** — hoy
   están en `^24.0.0` (`package.json:16-17`), con caret, no pineados (ver Gotchas).
2. **Antes de escribir código:** leer
   `node_modules/@react-native-firebase/messaging/android/src/main/AndroidManifest.xml`.
   Si declara `MESSAGING_EVENT` con prioridad ≥ 0 le gana a expo-notifications → crear
   `frontend/react-native.config.js` deshabilitando autolinking de Android **en el mismo
   commit que el install**. Si no le gana, no crear el archivo (ver Gotchas).
3. Branch por plataforma: `registerDeviceForRemoteMessages()` → **poll de `getAPNSToken()`
   hasta no-null, con timeout** → `getToken()`. El poll no es opcional (ver Gotchas).
4. Nuevo `PushFailureType`: `apns-token-timeout`. La taxonomía ya tiene la fase
   `apns-register` y el tipo `apns-register-failed`, pero nada nombra "registró bien y el
   token nunca llegó" — sin ese miembro, el poll es un parche silencioso.
5. Rotación en iOS con `onTokenRefresh` (Android se queda con `addPushTokenListener`).
   No es cosmético: RNFB auto-registra al arrancar, así que `addPushTokenListener`
   mandaría hex crudo de APNs en **cada** cold launch.
6. Agregar `"RNFBMessaging"` a `forceStaticLinking` en `app.json`.
7. Corregir el comentario de `pushNotifications.ts:286` ("Token nativo FCM") y el
   breadcrumb de `:299` ("FCM token acquired") — hoy los dos mienten en iOS.

No hace falta `firebase.json`: `messaging_ios_auto_register_for_remote_messages` default
a `true` (verificado en `firebase-schema.json`).

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

> **APNs Auth Key `.p8` — resuelto 14/08.** Ver "Ya hecho". Quedan tres.

Mandar **todo junto**, no de uno en uno:

1. **Estado de Agreements, Tax and Banking.** Solo el Account Holder los acepta, y un
   agreement pendiente **bloquea cualquier submission** con un error que no lo dice.
2. **Capabilities** en el App ID `com.bluai.app`: Push Notifications y Sign in with Apple.
3. **"Access to Certificates, Identifiers & Profiles"** para `blueyehurricanealerts@gmail.com`
   — es un checkbox *aparte* del rol de Admin; por eso developer.apple.com muestra
   "Enroll today".

Los puntos 2 y 3 son los que bloquean la prueba de entrega en dev client (sandbox), que
ya es posible ahora que las keys están en Firebase — y es mucho más rápida que TestFlight.
Ninguno de los tres bloquea código de cliente.

---

## Gotchas — las cosas que fallan en silencio

### `@react-native-firebase/messaging` va pineado exacto

`messaging@24.0.0` declara `peerDependencies: { "@react-native-firebase/app": "24.0.0" }`
— pin exacto, no rango. Pero `package.json:16-17` declara `app` y `auth` con **caret**
(`^24.0.0`). La versión resuelta hoy es `24.0.0`; el *rango* no lo garantiza mañana.

**El problema:** los tres perfiles de `eas.json` traen `NPM_CONFIG_LEGACY_PEER_DEPS: "1"`,
que le dice a npm que ignore conflictos de peers. Un par desalineado **no truena al
instalar ni al buildear** — truena en runtime, en un dispositivo, sin señal en compilación.

→ Instalar con `--save-exact` **y re-pinear los tres**. Nunca con caret.

### Un `Platform.OS` no protege el autolinking

Agregar una dependencia nativa cambia el merge del `AndroidManifest.xml` de **todas** las
plataformas que el paquete soporta — antes de que exista cualquier branch de JS.

`expo-notifications` declara su `ExpoFirebaseMessagingService` (y su receiver) con
`android:priority="-1"` **a propósito**: si hay otro servicio FCM en la app, cede. Android
resuelve un solo servicio para `com.google.firebase.MESSAGING_EVENT` (best match gana), así
que RNFB con prioridad ≥ 0 convertiría el de expo en código muerto — **en la plataforma que
hoy sí está en producción**.

Superficie real del daño: **recepción en primer plano en Android**
(`_layout.tsx:289`, `pushNotifications.ts:329`). El fondo se salva solo, porque el backend
manda payload `notification` y el SDK de FCM lo despliega sin invocar ningún servicio.

→ La pregunta "¿qué exporta este paquete?" y "¿qué declara en su manifest?" son distintas,
y solo una se ve en el editor.

### Firebase tiene **dos** slots de auth key, no uno

`Cloud Messaging → Apple app configuration` tiene fila de Development y fila de Production.
Firebase no lee el nombre que le pusiste a la key en Apple — etiqueta el **slot**, no el
archivo. Elige el key según el entorno del *device token*.

Dejar Production vacío falla **idéntico** a un `aps-environment` mal puesto: en dev client
funciona, en TestFlight Firebase no encuentra con qué firmar y devuelve un error de auth
genérico... que `notifications/service.py:92` interpreta borrando el token. La evidencia se
borra sola.

→ Son **dos switches independientes** (entitlement y slot) que default a "development" y
que solo se notan en TestFlight. Por eso la SACRED RULE.

### El nombre de la key no lo valida nadie

"Bluai Sandbox" / "Bluai production" son etiquetas que escribió una persona. Las auth keys
no tienen entorno: intercambiarlas funcionaría igual, sin error en ningún lado.

Solo importa en **una** operación: Apple topa en 2 keys activas por team, así que rotar
obliga a revocar primero. Antes de revocar, leer el Key ID del slot de Firebase — nunca
confiar en el nombre.

### `aps-environment`: push que sirve en tu escritorio y está muerto en producción

El entitlement decide con qué gateway de Apple habla la app: `development` → **sandbox**;
`production` → el gateway real. Son sistemas separados, con tokens separados. Un token
de sandbox no significa nada para producción.

El plugin de expo-notifications default a `'development'`. EAS *normalmente* lo reconcilia
contra el provisioning profile al firmar — por eso casi nadie lo nota. Cuando no lo hace:
funciona en dev client, funciona sideloaded, **y no entrega nada en TestFlight ni en la
App Store**, sin error en ningún lado.

→ Por eso la prueba de entrega tiene que ser en **TestFlight**, no en dev client.

### `registerDeviceForRemoteMessages()` no garantiza que haya token de APNs

Hace corto circuito cuando `isRegisteredForRemoteNotifications` ya es `true`, y **esa
bandera persiste entre lanzamientos**. O sea: en el primer arranque el `await` sí espera;
en todos los demás resuelve de inmediato, antes de que dispare
`didRegisterForRemoteNotificationsWithDeviceToken` — que es el único lugar donde se llama
`setAPNSToken:`. `getToken()` corre entonces con token de APNs en nil.

Falla en el camino común (warm start), no en un caso raro.

→ Poll de `getAPNSToken()` hasta no-null con timeout, y el timeout reportado como
`apns-token-timeout`. Si el SDK ya esperaba solo, el poll sale en la primera iteración y
no cuesta nada.

### El oráculo de una línea para saber si Fase 2 funcionó

`redactToken()` imprime prefijo + longitud. En el primer log de un build de iOS, mirar la
**clase de caracteres** antes que la longitud:

- `/^[0-9a-f]+$/` y `…(64)` → sigue siendo el token crudo de APNs → **no está arreglado**
- mayúsculas/minúsculas mezcladas con `:` o `-`, `…(140+)` → registration token de FCM → **sí**

La longitud sola es una prueba negativa ("no es 64"); la clase de caracteres es positiva.
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
E → A1 (install + check de manifest) → A2 (token) → D → C → B → F
```

`A → D → C → B` es la cadena de "push funciona en iOS", en orden de dependencia. Solo el
test final de entrega necesita a Ivan.

**E va primero porque es lo único con fecha externa** (campaña **lunes 17**, a 3 días).
Es backend puro, lo cubre `pytest` en CI, y no depende de nada de iOS.

Antes de decidir su urgencia, correr en **prod**:
```sql
SELECT COUNT(*) FROM device_tokens;
```
Abajo de 500 es un bug latente. Arriba de 500 ya está roto hoy.

### Los tres tipos de bloqueador (no confundirlos)

| Tipo | Cuáles | Quién lo detecta |
|---|---|---|
| Bloquean una app que **sirva** | A, D, C, B | **Nadie.** El build compila, instala y corre con el push muerto |
| Bloquean la **aprobación** | F (Guideline 5.1.1(v)) | Un humano en review |
| Bloquean la **subida** | Privacy policy URL, Agreements/Tax/Banking, App Privacy, screenshots | App Store Connect |

Solo F lo obliga alguien externo. Por eso A–D necesitan la SACRED RULE: la App Store
aprueba sin problema una app cuya función principal no hace nada en silencio.
