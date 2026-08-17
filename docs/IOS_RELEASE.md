# iOS Release — estado y pendientes

Estado al **17 de agosto de 2026**. Este doc es la fuente de verdad de qué falta para
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
| **A — token FCM en iOS** (`1e704ea`) | `messaging@24.0.0` + los tres RNFB pineados exacto; `react-native.config.js` desliga Android; `acquireFcmToken()` con poll de APNs en `pushNotifications.ts`; `RNFBMessaging` en `forceStaticLinking` |
| **D — `aps-environment`** (`32f011f`) | Una línea: `["expo-notifications", { "mode": "production" }]`. Probado en los dos caminos (ver Gotchas) |
| **C — config APNs en backend** | Helper `build_apns_config()` en `notifications/service.py`; 6 de 7 sends migrados. Sonido + `interruption-level` en las alertas de ciclón y SOS. 225 tests pasan |
| **Diagnóstico de fallos push** | `summarize_push_failures()` — se loguea el **tipo** de excepción de FCM en vez de los tokens completos, y **antes** de borrar. `ThirdPartyAuthError` = auth key de APNs inválida, el error clave del primer TestFlight |
| **Columna `platform`** | `device_tokens.platform` + backfill que se apaga solo + `Platform.OS` desde el cliente. Ver G — la ventana del backfill se cierra con el primer build de iOS |
| **F — borrado de cuenta** (`2b98048`, `aa30973`) | DB primero y Firebase después; `sos_events.sender_id` → `ON DELETE CASCADE`; limpieza de AsyncStorage al borrar; `test_delete_cascade.py` en CI. **Validado el 17/08 en el Simulator** (no en iPhone físico — ver abajo), con cuenta de Google |

Verificado en Pixel 7: el happy path de push, el path de fallo (Sentry + toast + 3
reintentos), y la carrera del 404 (no se dispara — `upsertUserProfile` gana con holgura).

---

## Falta — código, nada bloqueado

### ~~A. Fase 2 — token de push en iOS~~ ✅ **HECHO** (`1e704ea`)

**`apns-token-timeout` ya está** (15/08). No era cosmético: separa "el registro tronó"
de "el registro funcionó y Apple nunca mandó el token", y **esa segunda es la falla
esperada hoy**, porque el App ID `com.bluai.app` todavía no tiene la capability de Push
(bloqueador #2 de Ivan). Sin el tipo aparte, Sentry mezcla "mi código está mal" con
"falta que Ivan habilite Push" en un solo bucket. El mensaje ahora cita el presupuesto
real del poll (10 × 300ms).

Queda pendiente `onTokenRefresh` en iOS (rotación de token). Android sigue con
`addPushTokenListener`, que en iOS mandaría hex crudo de APNs en cada cold launch.
**Verificar en el primer build de device** antes de darlo por bueno.

### ~~B. Fase 3 — presentación en primer plano~~ ✅ **HECHO (15/08)**

> **Corrección:** este doc decía que "una alerta en primer plano no se ve" en iOS. **Era
> falso.** El todo-en-false era deliberado: la app dibuja su propia UI (toast de
> sonner-native, `AlarmScreen`) en vez del banner del sistema. Poner los flags en true
> habría dado banner **encima** del toast — UI duplicada, no un arreglo.

Lo que sí estaba roto era el **sonido**: en Android el canal (`IMPORTANCE_MAX`) suena
aunque el handler diga que no, así que nunca se notó; iOS obedece el handler literal y una
alerta nivel 4 llegaba muda con la app abierta. El `sound: "default"` de C no sirve de
nada si el handler se niega a reproducirlo — **son dos switches en repos distintos y los
dos tienen que estar prendidos**.

Ahora `handleNotification` recibe la notificación y devuelve `shouldPlaySound: isCritical`
(`fullScreen`, `category=sos`, o nivel ≥ 4). Lo visual sigue siendo de la app.

**Verificar en el Pixel:** que una alerta crítica no suene **dos veces** en Android (canal
+ handler). Es un fallo ruidoso, no silencioso — se nota al primer push.

**sonner-native en iOS: investigado, es sólido.** `toaster.tsx:58` mete el Toaster en un
`FullWindowOverlay` de react-native-screens (4.16.0) = un `UIWindow` aparte, por encima de
native-stack y de modales; `pointerEvents: 'box-none'` deja pasar los toques a los botones
de acción. El comentario del propio paquete dice que la plataforma frágil es **Android**
(depende de `elevation: 9999` dentro de la misma ventana). `<Toaster />` está montado como
hermano de `<Stack>`, fuera del navigator — que es lo correcto.

### ~~C. Fase 4 — config APNs en backend~~ ✅ **6 de 7 HECHO**

Helper `build_apns_config()` en `notifications/service.py`. Migrados: `siat:326`, `siat:411`,
`sos_trigger:104`, `sos_invite:138`, `notifications:122`, `notifications:186`.

**Lo importante no era el sonido, era `interruption-level`.** Los Focus modes de iOS 15+
(Sueño, No Molestar) **suprimen** notificaciones normales. Sin `time-sensitive`, la alerta
de huracán de las 3am se retiene hasta que el usuario desbloquee. Las dos alertas de ciclón
y el SOS lo llevan; la invitación SOS y la campaña **no** (Apple penaliza usar el flag para
marketing). `Aps` no tiene campo para esto — va en `custom_data`.

El séptimo (`contacts_refresh`) se difirió: ver **G**.

### ~~D. `aps-environment`~~ ✅ **HECHO** (`32f011f`)

Una línea en `app.json`: `["expo-notifications", { "mode": "production" }]`. Ver Gotchas
para por qué esto basta y por qué **no** hizo falta `app.config.js`.

---

## Falta — no es de iOS, pero iOS lo empeora

### ~~E. Corte de 500 + predicado de borrado~~ ✅ **HECHO (17/08)** — rama `fix/500-cap-firebase`

Eran dos bugs distintos en el mismo código de envío, los dos silenciosos:

**1. Sin cota de 500.** `send_each_for_multicast` lanza un `ValueError` **del lado del
cliente, antes de cualquier llamada de red** (`firebase_admin/messaging.py:435`) si le
pasan más de 500 tokens. No hay error de Firebase ni status HTTP: el push no sale y el
`except Exception` se lo traga. Sin cota estaban `send_all_notifications` (campaña: toda
la tabla) y `_push_smn_for_alert` (SIAT: todos los usuarios afectados, aplanados).

**2. Borraba tokens buenos.** El predicado era `if not r.success`: **cualquier** fallo
borraba el token, incluidos los transitorios. `ThirdPartyAuthError` significa "la auth key
de APNs es inválida" y llega **por token** — o sea que en cuanto entraran tokens de iOS
con cualquier problema de aprovisionamiento, el backend habría borrado justo los aparatos
que uno está tratando de depurar: se registran, fallan, se borran, se re-registran, en
bucle y sin dejar rastro (el borrado destruye la evidencia). Esta mitad era la urgente
para iOS; por eso se adelantó E en vez de esperar al release.

**Arreglo:**

- `_send_multicast_with_retry` parte en chunks de 500 y devuelve **una sola** respuesta
  agregada, en el mismo orden que los tokens de entrada — ningún call site cambió.
- **Los dos sends de SIAT se migraron al helper.** Llamaban al SDK directo, así que
  ponerlo solo en el helper no los habría acotado. Ahora los siete multicast pasan por ahí.
- Borrado por lista blanca: `_PERMANENT_FAILURE_TYPES = {"UnregisteredError"}`. Un tipo de
  error desconocido ya no borra nada.

9 pruebas nuevas en `notifications/tests/test_multicast.py`; 235 pasan.

### G. `contacts_refresh` en iOS — **columna `platform` ✅ HECHA (15/08), el split sigue diferido**

**La columna se adelantó a propósito, porque su ventana se cierra.** Hoy el 100% de las
filas de `device_tokens` son de Android por construcción (iOS nunca se publicó), así que
el backfill es correcto y gratis. En cuanto el primer build de iOS registre un token deja
de serlo **para siempre**: un registration token de FCM es opaco e idéntico entre
plataformas, o sea que nada en la fila permite clasificarla después. Es la típica columna
que hay que agregar *antes* de que los datos dejen de ser homogéneos, no después.

El backfill en `main.py` **se apaga solo** (`AND NOT EXISTS (SELECT 1 ... WHERE platform
IS NOT NULL)`): corre mientras ninguna fila tenga plataforma y nunca vuelve a correr
después. Sin esa guarda correría en cada arranque y etiquetaría como "android" cualquier
token de iOS que llegara sin plataforma. El cliente ya manda `Platform.OS`, y el
`ON CONFLICT` usa `COALESCE` para que un cliente viejo no borre una clasificación buena.

**Lo que sigue diferido** es partir el send — el único de C que **sí toca Android**.

`notifications/service.py` manda `Notification(title=" ", body=" ")` + canal
`contacts_refresh_silent`. En Android el **canal** lo hace invisible. En iOS no hay
canales → hoy dibuja un **banner en blanco visible**. La forma correcta en iOS es push de
background: sin bloque `notification`, `content_available=True`, `apns-push-type: background`.

**Por qué no se puede arreglar en un solo mensaje:** con bloque `notification` iOS lo
manda como alerta; sin él, en Android se vuelve data-only y cambia qué handler dispara.
Hay que mandar iOS y Android por separado → hace falta saber la plataforma del token, y
**`device_tokens` no tiene columna `platform`** (`main.py:67`).

Alcance: `ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS platform TEXT` en
`ensure_core_tables()`, que el cliente la mande al registrar, y partir el send en dos.
Es un bug cosmético en un push no crítico — de ahí el diferimiento.

### H. Unificar ambas plataformas en RNFB — **DIFERIDO (15/08)**

Decisión del 15/08: se ship a iOS con el split (`react-native.config.js`) y la migración
se hace como PR aparte. Un agente de research auditó la decisión; lo que encontró:

- **Borrar `react-native.config.js` NO es toda la migración.** Al linkear messaging en
  Android chocan `com.google.firebase.messaging.default_notification_color`, que declaran
  tanto el plugin de expo-notifications como el manifest de RNFB, sin `tools:replace`
  ([invertase/react-native-firebase#8165](https://github.com/invertase/react-native-firebase/issues/8165)).
  El fix propio de RNFB se salta porque guarda con `!hasMetaData(...)`. **El build de
  Android truena.**
- **Sospecha sin verificar: el tap en Android ya está roto hoy.** Con payload
  `notification`+`data` y la app en background, Firebase la despliega solo y su content
  intent va al launcher — el `PendingIntent` de expo nunca se adjunta, así que
  `getLastNotificationResponseAsync()` regresaría null y `_layout.tsx:360-380` sería
  código muerto en Android. `getInitialNotification()` de RNFB lo arreglaría. **Verificar
  con 5 min en el Pixel** (mandar push → background → tap → ¿navega a la pantalla correcta
  o solo abre la app?) antes de dimensionar el PR.
- **La raíz es la forma del payload.** Mandar data-only desde el backend le devolvería a
  expo-notifications el control del display y del tap en Android (~10 líneas de backend).
  Es una tercera opción que ninguna de las dos rutas consideró.

### ~~F. Borrado de cuenta (Guideline 5.1.1(v))~~ ✅ **HECHO (17/08)** — `2b98048` + `aa30973`

Backend: la fila de `users` se borra **primero** y Firebase después. El orden importa —
si Firebase falla, el usuario vuelve a entrar y se le crea perfil nuevo (recuperable, y
**ya no quedan push tokens**). Al revés, un fallo de DB deja una cuenta que no puede
entrar pero **sigue recibiendo alertas de huracán**: justo lo que prohíbe 5.1.1(v).

Cliente: los tres problemas de `AuthContext.tsx` resueltos (`authFetch`, `API_BASE_URL`,
`/api/v1/users/me`). Y `SettingsScreen.handleDeleteAccount` ahora limpia AsyncStorage
(`clearOnboardingData` + `resetAllTours`): `@blueye_onboarding` guardaba **nombre,
teléfono, dirección, CP, rango de edad y nivel de ansiedad** y sobrevivía a un borrado
que la UI anuncia como "permanente". El backend no puede tocar AsyncStorage.

**Mina encontrada de paso:** `sos_events.sender_id` estaba declarado sin regla de
borrado → el default de Postgres es `NO ACTION`, así que borrar a cualquier usuario que
alguna vez mandó un SOS fallaba con violación de FK. Pasaba la prueba manual porque una
cuenta recién creada no tiene historial. Convertido a `ON DELETE CASCADE` con un bloque
`DO $$` autodesactivable (`confdeltype <> 'c'`) en `ensure_core_tables`.

Probado de verdad, no inferido:
- `app/features/users/tests/test_delete_cascade.py` — borra un usuario **con historial en
  todas las tablas que lo referencian** y verifica además que los datos de OTRO usuario
  sobreviven intactos (un CASCADE de más es tan grave como uno de menos). Corre en CI.
- En el **Simulator** (17/08, backend local, cuenta de Google): `DELETE 200` → fila vieja
  destruida, fila nueva `id 1215` con 0 `device_tokens` / 0 `sos_contacts` / 0 `sos_events`.
  El Simulator es válido para esto: el borrado no toca APNs ni entitlements. **Falta
  repetirlo con Sign in with Apple**, que es donde aparece P2.

---

## Post-release — encontrado durante el release, NO bloquea el envío

> Ninguno de estos impide subir a App Store. Se documentan aquí para no perderlos.

### P1. El gate de onboarding usa un proxy roto (`display_name`)

`app/_layout.tsx:178-195`: si AsyncStorage está vacío, el gate le pregunta al backend
"¿este usuario tiene `display_name`?" y si sí, marca el onboarding como completado.

Pero `users/router.py:28` llena `display_name` con el claim `name` del token de Firebase
en el **primer** `POST /api/v1/users/me` — la llamada que *crea* la cuenta. Con Google
sign-in ese claim siempre viene, así que el campo existe segundos después del registro,
antes de que el usuario vea una sola pantalla de onboarding.

**Efecto: cualquier usuario de Google se salta el onboarding en una instalación limpia.**
Medido en la DB de staging (17/08): 14 usuarios con `display_name`, solo **4 con `phone`**.

Una bandera de "completado" tiene que escribirla el paso que dice medir. Hoy nada del
lado servidor registra que el onboarding pasó: `submitOnboarding`
(`app/onboarding/_context/OnboardingContext.tsx:36`) solo escribe AsyncStorage, y el
único rastro remoto es `phone` — que es **opcional** (`phone?: string` en `_types.ts`) y
se manda fire-and-forget con `.catch(() => {})`, o sea que un fallo se traga en silencio.

Arreglo correcto: columna `onboarding_completed BOOLEAN` vía `ALTER TABLE ... ADD COLUMN
IF NOT EXISTS` en `ensure_core_tables` (no hay Alembic), escrita por `submitOnboarding`.
~30 líneas. Preexistente a esta rama.

### P2. No se revoca el token de Apple al borrar la cuenta

Desde el 30/06/2022 Apple exige que una app con Sign in with Apple **revoque el token**
del usuario al borrar la cuenta, no solo que borre la cuenta local. `auth.delete_user()`
de `firebase_admin` borra el usuario de Firebase pero **no toca el lado de Apple**: el
Apple ID sigue listando la app en "Apps que usan tu Apple ID".

No hay nada de revocación en el repo (verificado 17/08: los únicos `revoke` son de
`sos_invitations`). `app.json` tiene `usesAppleSignIn: true`, así que aplica.

Trampa: la revocación necesita el `authorizationCode` que devuelve
`AppleAuthentication.signInAsync()`, y `AuthContext.tsx` hoy lo **descarta**. Hay que
guardarlo al iniciar sesión — después no se puede recuperar.

**Falta verificar** qué ofrece Firebase hoy del lado servidor antes de implementar a mano.
Es causal de rechazo documentada bajo la misma 5.1.1(v), así que conviene cerrarlo pronto
aunque no bloquee el primer envío.

---

## Falta en App Store Connect (Diego) — **bloquea el envío**

No es código, pero sin esto la review se rechaza:

1. **Cuenta demo para App Review.** La app entra por `AuthGate`: sin credenciales el
   revisor **no pasa del login** y eso es rechazo automático. Crear una cuenta de prueba
   —con onboarding ya completado y algún contacto SOS, para que la app no se vea vacía— y
   ponerla en *App Review Information*. Google/Apple sign-in complica al revisor: si no
   puede entrar con user+password, hay que dejar instrucciones explícitas ahí mismo.
2. **URL de la política de privacidad.** No está en el código (verificado 17/08: no hay
   link ni constante en el repo). Vive en **Google Play Console → Ficha de Store**; hay
   que copiarla a App Store Connect.

> **Agreements/Tax/Banking NO se heredan de Play Store.** Son contratos aparte con Apple;
> nada se transfiere. Como no hay librerías de IAP en `package.json`, basta con el
> *free-app agreement* aceptado por el Account Holder — sin datos bancarios.

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

**Resuelto con una línea, y por una razón que vale la pena entender** (`32f011f`):

```json
["expo-notifications", { "mode": "production" }]
```

El plugin escribe el entitlement **solo si nadie más lo puso**
(`withNotificationsIOS.ts`: `if (!config.modResults['aps-environment'])`). Y el base mod
lee el archivo de entitlements que ya exista antes de correr los plugins
(`withIosBaseMods.js:359-362`). O sea que el switch por entorno sale gratis:

| Camino | Entitlements de entrada | Resultado |
|---|---|---|
| **EAS** (`ios/` está gitignored → no llega) | template `{}` | escribe `production` ✅ |
| **Local `expo run:ios`** | lee `ios/Bluai/Bluai.entitlements` con `development` | **no lo pisa** ✅ |

Los dos caminos se probaron corriendo prebuild, no se dedujeron. **No hizo falta
`app.config.js`** — y eso importa: un `app.config.js` cambia cómo se resuelve la config de
**las dos** plataformas, así que un spread mal hecho tira `android.permissions` o las keys
de maps. La prop `mode` no aparece ni una vez en `withNotificationsAndroid.ts`.

**Footgun:** `npx expo prebuild --clean` en local borra `ios/` → regeneras con
`production` contra un perfil de desarrollo → falla el codesign. Ruidoso, no silencioso.
Si el equipo empieza a usar `--clean` de rutina, ahí sí toca `app.config.js`.

→ La prueba de entrega igual tiene que ser en **TestFlight**, no en dev client: el slot de
Firebase es un switch independiente del entitlement.

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

### expo-notifications **no** encadena el delegate de iOS — se rinde

RNFB encadena (guarda `_originalDelegate`). expo-notifications **no**: si ya hay un
delegate puesto, loguea y se sale sin instalarse
(`NotificationCenterManager.swift:50-60`). O sea que el orden decide:

- expo primero → RNFB lo captura → **los dos sirven**
- RNFB primero → **toda la capa de notificaciones de expo en iOS queda muerta, en silencio**

El orden *debería* favorecer a expo, pero no está verificado en device y **aplica igual
con split o unificado**.

→ En el primer build de iOS, buscar en consola:
`[expo-notifications] NotificationCenterManager encountered already present delegate`.
Si sale, el push de iOS está roto sin importar todo lo demás.

### `ios/` se corrompe en silencio y solo te pasa a ti

`ios/Bluai/SplashScreen.storyboard` estaba en **0 bytes** (15/08). Eso tronaba
`expo prebuild` y `expo config --type introspect` con un error de splash que no dice nada
del splash. Se arregla borrando el archivo y dejando que prebuild lo regenere.

Por qué nadie más lo ve: `ios/` está gitignored, EAS lo genera desde template en cada
build. O sea que es un directorio mutable, sin versionar y sin revisar, que **solo existe
en la máquina que hace pruebas en device** — justo la que más lo necesita. Los builds en
la nube siguen pasando.

→ En directorios generados: borrar antes que debuggear. Regenerar es gratis.

### El oráculo de una línea para saber si Fase 2 funcionó

`redactToken()` imprime prefijo + longitud. En el primer log de un build de iOS, mirar la
**clase de caracteres** antes que la longitud:

- `/^[0-9a-f]+$/` y `…(64)` → sigue siendo el token crudo de APNs → **no está arreglado**
- mayúsculas/minúsculas mezcladas con `:` o `-`, `…(140+)` → registration token de FCM → **sí**

La longitud sola es una prueba negativa ("no es 64"); la clase de caracteres es positiva.
No hace falta mandar ningún push para saberlo.

### El Simulator no firma nada — y por eso engaña

`npx expo run:ios` (Simulator) **no requiere certificado**: las builds de Simulator van sin
firmar. `npx expo run:ios --device` sí, y ahí sale `CommandError: No code signing
certificates are available to use`.

O sea que se puede llevar semanas "probando en iOS" sin haber firmado nunca nada, y sin
poder probar **push, entitlements ni `aps-environment`** — que es justo lo que falta.

**Cómo saber en cuál estás corriendo, desde los logs del backend:** el Simulator comparte
la pila de red del Mac, así que sus requests salen con la IP **del Mac**. Un iPhone físico
tiene su propia IP por DHCP. Si `ipconfig getifaddr en0` es igual a la IP del cliente en
los logs de uvicorn, estás en el Simulator.

Diagnóstico rápido del keychain: `security find-identity -v -p codesigning`.
`0 valid identities found` = no hay con qué firmar (estado al 17/08).

### `frontend/ios/` es artefacto, no fuente

Está en `.gitignore` y lo genera prebuild (CNG). El `Info.plist` que ves en disco
describe la config de *cuando corrió prebuild la última vez*, no la de hoy.

- La pregunta es `app.json`; `ios/` es una respuesta cacheada.
- Para ver qué produciría la config **sin generar nada**: `npx expo config --type introspect`.

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
~~A~~ → ~~D~~ → ~~C~~ → ~~B~~ → ~~F~~ → **entrega de push en device iOS**
   |  después del release: P1, P2, E, G, H
```

**Toda la cadena de código de push está hecha. Nada de eso se ha corrido en un iPhone.**
F (borrado de cuenta) ya se validó en device el 17/08 y no depende del push.

**El siguiente paso no es código, es recibir un push en el iPhone.** Tres cosas se validan
de un solo build, y las tres pueden invalidar trabajo ya hecho:

1. La clase de caracteres del token (¿FCM o hex de APNs?) — ver el oráculo arriba
2. El log del delegate de expo-notifications — ver Gotchas
3. Que el poll de `getAPNSToken()` salga en la primera iteración en warm start

B ya está escrito, pero el handler de primer plano **sigue sin probarse**: no se puede
sin un push que llegue de verdad.

**Diferidos, en orden de valor:** P2 (revocar token de Apple — misma guideline que F),
P1 (gate de onboarding — afecta a todo usuario de Google), E (corte de 500 — solo importa
arriba de 500 tokens), H (unificar en RNFB — arregla el tap en Android), G
(`contacts_refresh`, cosmético).

### Los tres tipos de bloqueador (no confundirlos)

| Tipo | Cuáles | Quién lo detecta |
|---|---|---|
| Bloquean una app que **sirva** | A, D, C, B | **Nadie.** El build compila, instala y corre con el push muerto |
| Bloquean la **aprobación** | F (Guideline 5.1.1(v)) | Un humano en review |
| Bloquean la **subida** | Privacy policy URL, Agreements/Tax/Banking, App Privacy, screenshots | App Store Connect |

Solo F lo obliga alguien externo. Por eso A–D necesitan la SACRED RULE: la App Store
aprueba sin problema una app cuya función principal no hace nada en silencio.


## Lista de cosas para appstore connect

Aviso de privacidad: https://www.bluai.com.mx/aviso-de-privacidad