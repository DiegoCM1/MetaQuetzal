# Lanzamiento + iOS + Coordinación — Diego

## Resumen de tareas

### P1 — Must-Have (bloqueantes para v1.0)

| # | Feature / Tarea | Mini-deadline | Standard |
|---|---|---|---|
| 1 | Sign in with Apple — Firebase Apple provider | 🟡 May 6 (vencido) | **Frontend committed (20 may)**: `expo-apple-authentication` + `expo-crypto`, `usesAppleSignIn: true` en `app.json`, botón Apple HIG-compliant en login (iOS-only), `signInWithApple` con nonce SHA-256 + `OAuthProvider('apple.com')` + `signInWithCredential`. Pendiente: Service ID en Apple Dev portal (gated #3 Héctor), enable Apple provider en Firebase Console (gated Service ID), rebuild iOS con nuevo entitlement, test E2E en device físico |
| 3 | iOS pipeline: certs, APNs, EAS build, App Store Connect | 🟡 May 13 (vencido) | Entorno iOS ✅. EAS API key registrada ✅. `eas build` intentado → error: no team membership en Apple Developer Program. Héctor arregla hoy 21:00. APNs pospuesto hasta iPhone físico |
| 4 | ~~Sentry en producción — telemetría de crashes~~ ✅ | May 14 | Evento visible en dashboard |
| 5 | Frontend general fixes — pantallas y navegación | 🟢 Continuo | En progreso — sin crashes en golden path |
| 6 | ~~Keystore de producción asegurado y respaldado~~ ✅ | May 16 | Backup verificado fuera del equipo |
| 7 | Store listings — Play Store + App Store (temporada huracanes) | ✅ | Revisado y publicado en PlayStore |
| 8 | Closed testing → producción Android (Play Store) | 🟡 18 may | Acceso a producción SOLICITADO — en revisión por Google (3-7 días). Pendiente: subir AAB de producción |
| 9 | Submission iOS a App Store Connect | 🔴 bloqueado | NO está submitted. Depende de #1 (Apple Sign-In) y #3 (pipeline iOS) |
| 2 | iOS offline AI — Llama on-device confiable | 🟡 May 11 (vencido) | Funciona en device (Android producción confirmado). iPhone físico recibido 20 may. Verificación iOS pendiente de build firmado (gated #3 Héctor). Hardening shipped 20 may: disk space check, graceful fallback, retryDownload cleanup. Conocido: phonemis arch warning en sim iOS sugiere posible problema en iOS — Sprint 2 |
| 10 | PR reviewer — toda PR crítica del sprint | Continuo | Sin merge sin tu revisión |

- APNS (App push notifications) Until iphone arrives, not possible before that.

### P2 — Extensión (solo si P1 completo)

| # | Feature |
|---|---|
| 11 | Email/password login + password recovery |

### Plan de ejecución por dependencias (20 may, 20:00)

#### 🟢 Activo ahora — sin bloqueante externo
- **AAB de producción Android** (para #8): `eas build --platform android --profile production` corriendo en background 20 may, queda listo para subir cuando Google apruebe acceso.
- **#5 Frontend general fixes**: continuo. Tonight: iOS smoke en sim iOS 26 reveló bug de beta sim (touch dispatch en bottom-bar no funciona — onboarding Continuar y tab bar). No afecta dispositivos reales. Documentado en RoadMap known gaps.
- **#10 PR review**: PR #118 de Val revisada — branch severamente atrasado de dev (3 archivos que está "agregando" ya existen en dev por PR #104), bloqueada hasta rebase. Comentario draft listo para postear.

#### 🟡 Bloqueado en Héctor (ETA: hoy 21:00)
- **#3 iOS pipeline**: membresía Apple Developer Program para `blueyehurricanealerts@gmail.com` + verificación del Issuer ID correcto. Después del fix → re-intento de `eas build --platform ios --profile production` con 2FA. Si pasa: EAS genera distribution cert + provisioning profile + registra App ID → build llega a TestFlight (objetivo May 20).
- **#9 iOS submission**: gated en #3 funcionando.

#### 🔴 Bloqueado en iPhone físico (ETA: días)
- **#2 Offline AI** — verificación en device iOS.
- **#1 Apple Sign-In** — test E2E en device real.
- **APNs key**: verificación de environment + recibir `.p8` de Héctor + subir a Firebase Cloud Messaging + confirmar push delivery. Sin device físico no se puede verificar push.
- **Golden path E2E** en device físico (DoD final).

#### 🔴 Bloqueado en Google (ETA: 3-7 días desde 18 may)
- **#8 Release de producción Android** — esperando aprobación de Google para acceso a producción. El AAB ya estará listo gracias al item activo de arriba.

#### ✅ Completado (referencia)
- #4 Sentry; #6 Keystore; #7 Play Store listing (App Store listing iOS: por confirmar); entorno iOS dev funcionando; Firebase iOS cableado; EAS App Store Connect API key registrada.

---

## Contexto

Diego es el único full-time. Lleva el peso de lo que no perdona: Apple, Play Store, certificados, telemetría. Si falla, no hay app en la tienda. Además, es el revisor final — la calidad de `main` pasa por sus manos.

---

## Feature 1 — Sign in with Apple

**Due: May 6**

### Por qué es obligatorio
Apple Guideline 4.8: cualquier app con login de terceros (Google) **debe** ofrecer Sign in with Apple. Sin esto, App Store rechaza el build.

### Qué construir

**Firebase Console:**
1. Ir a Authentication → Sign-in method → Apple
2. Habilitar provider
3. Configurar Service ID (se genera en Apple Developer portal)
4. Configurar redirect URL de Firebase en Apple Developer

**Apple Developer portal:**
1. Crear un Service ID para la app
2. Habilitar Sign in with Apple capability
3. Configurar el dominio de Firebase como redirect URL

**EAS / app.json:**
```json
"ios": {
  "usesAppleSignIn": true
}
```

**Frontend — agregar botón Apple en pantalla de login:**
- Usar `expo-apple-authentication`
- Mismo flujo que Google Sign-In: obtener credential → pasarla a Firebase → `signInWithCredential`
- Botón Apple debe ser negro sobre fondo blanco (requisito de Apple HIG)

### Test mínimo
Login con Apple en iPhone físico → usuario aparece en Firebase Auth console → perfil creado en DB.

---

## Feature 2 — iOS offline AI (Llama on-device)

**Due: May 11**

### Contexto
El AI offline usa Llama 3.2 1B/3B cuantizado corriendo en el dispositivo. El problema reportado: no descarga en algunos dispositivos. Antes de iOS submission, esto debe funcionar de forma confiable.

### Problemas conocidos
- Descarga falla en algunos dispositivos (causa exacta desconocida — puede ser espacio, timeout, integridad del archivo)
- No hay fallback claro cuando falla la descarga

### Qué revisar y arreglar

1. **Mecanismo de descarga:**
   - Verificar que la descarga usa resumable download (no empieza desde cero si se interrumpe)
   - Mostrar progreso real al usuario durante descarga
   - Verificar integridad del archivo después de descargar (checksum)

2. **Fallback:**
   - Si descarga falla → mostrar mensaje claro + botón reintentar
   - Si modelo no está disponible → degradar gracefully a AI online (`/api/v1/ai`)
   - No crashear silenciosamente

3. **Espacio en dispositivo:**
   - Verificar espacio disponible antes de intentar descarga
   - Si < X MB disponibles → mostrar advertencia antes de descargar

4. **Testing:**
   - Probar en iPhone con espacio limitado
   - Probar con conexión interrumpida durante descarga
   - Probar en dispositivo sin descargar el modelo → debe degradar a online sin crash

### Definition of Done
- [ ] Descarga completa en iPhone físico sin error
- [ ] Interrupción durante descarga → retoma desde donde quedó
- [ ] Dispositivo sin modelo → degrada a AI online sin crash
- [ ] Espacio insuficiente → mensaje de error claro

---

## Feature 3 — iOS Pipeline

**Due: May 13 (build en device físico)**
**Due: May 18 (submission)**

### Estado actual (19 may, 18:00)
- ✅ Entorno iOS regenerado limpio desde `app.json` (CNG — `ios/` en `.gitignore`)
- ✅ Firebase iOS cableado: `GoogleService-Info.plist`, plugin `@react-native-firebase/app`, `useFrameworks: static` + `forceStaticLinking` (workaround bug SDK 54, expo#39607)
- ✅ App compila (0 errores) y corre en el Simulador con Firebase inicializado
- ✅ App Store Connect API key (`AuthKey_N3M5RJLBGQ.p8`) registrada en EAS para Submit
- 🟡 `eas build --platform ios --profile production` intentado → falló en credentials con: *"You have no team associated with your Apple account, cannot proceed."* Diego es Admin en App Store Connect pero NO está en el Apple Developer Program team. Héctor arregla hoy 21:00.
- 🟡 Issuer ID enviado por Héctor (`f2ad728e-…`) coincide con el Developer ID personal de Diego en App Store Connect — sospechoso, Héctor verifica
- ⬜ App Store Connect app record (EAS lo puede crear vía submit una vez funcione el build)
- ⬜ APNs key — pospuesto hasta llegada del iPhone (push no verificable sin device)
- ⬜ Re-intento de `eas build` iOS — después del fix de Héctor

### Componentes

**Certificates & Provisioning:**
- Distribution certificate en Apple Developer
- Provisioning profile para producción (App Store distribution)
- APNs key configurada (para push notifications en iOS)
- Configurar todo en EAS (`eas.json` credentials)

**EAS Build:**
```bash
eas build --platform ios --profile production
```

**APNs (push notifications iOS):**
- Generar APNs key en Apple Developer
- Subir a Firebase Console → Project Settings → Cloud Messaging → iOS app
- Verificar que Edgar's notification feature funciona en iPhone físico

**App Store Connect:**
- Crear app record en App Store Connect
- Bundle ID debe coincidir con el configurado en EAS
- Privacy policy URL requerida (ya debe existir del Play Store)
- Capture screenshots (iPhone 6.7" y 6.1" requeridos)
- Age rating questionnaire

**Submission checklist:**
- [ ] Build subido vía EAS o Transporter
- [ ] Todas las screenshots subidas
- [ ] Privacy policy URL válida
- [ ] Age rating completo
- [ ] Sign in with Apple funcionando en el build
- [ ] APNs funcionando (notificaciones llegan en device)
- [ ] Submit for review

---

## Feature 4 — Sentry en producción

**Due: May 14**

### Por qué
Sin telemetría de crashes, los bugs de producción son invisibles. Con 14 días de closed testing y usuarios reales, necesitas saber qué crashea antes de lanzar.

### Setup

**Instalar:**
```bash
npx expo install @sentry/react-native
```

**Inicializar en el root de la app:**
```js
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
})
```

**EAS / eas.json:** agregar `EXPO_PUBLIC_SENTRY_DSN` como environment variable.

**Verificar:** lanzar un error manual en dev → confirmar que llega al dashboard de Sentry.

### Definition of Done
- [x] Sentry inicializado en la app (`@sentry/react-native` via wizard)
- [x] DSN en variables de entorno — `EXPO_PUBLIC_SENTRY_DSN` en `.env`, `eas.json` (todos los perfiles), y `_layout.tsx` usa `process.env`
- [x] Evento de prueba visible en Sentry dashboard — confirmado con botón de prueba
- [x] Source maps — `SENTRY_AUTH_TOKEN` añadido como EAS secret (tipo Secret)

### Extras completados
- [x] User identity en cada evento — `Sentry.setUser()` en `onAuthStateChanged` (AuthContext)
- [x] Google Sign-In: loading state + guardrail `IN_PROGRESS` — botón deshabilitado con opacidad 0.5 mientras sign-in está en progreso

---

## Feature 5 — Frontend General Fixes

**Due: Continuo — completar antes del día 15 (testing E2E personal)**

### Qué incluye
Bugs conocidos y pantallas que no están 100% funcionales. Revisar y fijar antes del E2E personal del día 17.

**Áreas a revisar:**
- Navegación general — tabs, deep links, back buttons
- `ChatAIScreen` — actualmente solo re-exporta desde `../ai`. Verificar que la pantalla funciona E2E con el backend
- Pantallas que usan datos del backend — verificar que manejan estados de carga, error, y vacío correctamente
- Offline AI — ver Feature 2
- Keyboard avoiding en modales (problema reportado anteriormente en el mapa)

**Proceso:**
- Golden path completo en device físico antes del día 15
- Documentar bugs encontrados → abrir issues en GitHub → triagear por criticidad

---

## Feature 6 — Keystore backup

**Due: May 16**

El keystore de Android es la única llave para publicar updates a Play Store. Si se pierde, la app en producción no puede recibir updates nunca más.

**Pasos:**
1. Localizar el keystore actual (generado por EAS o manualmente)
2. Exportar y guardar en al menos 2 lugares fuera de la máquina:
   - Gestor de contraseñas (1Password, Bitwarden) o
   - Google Drive / iCloud con 2FA activo
3. Documentar: nombre del keystore, alias, y dónde están guardadas las contraseñas

**No subir el keystore a GitHub nunca.**

### ✅ Completado — May 6
- Keystore gestionado por EAS (copia primaria segura en servidores EAS)
- Copia local descargada y subida a Google Drive → Mi Unidad/Development/Credentials Keystore
- Key Alias documentado: `3bc644f9e85f25e3015adbc18431b14c`
- `.jks` ya estaba en `.gitignore` — nunca en el repo

---

## Feature 7 — Store Listings

**Due: May 16**

### Play Store (Android)
- Título: BluAI (30 chars max)
- Descripción corta: (80 chars max) — enfocada en temporada de huracanes
- Descripción larga: (4000 chars max) — features, seguridad, cómo funciona el SIAT
- Screenshots: phone (mínimo 2), tablet si es posible
- Feature graphic: 1024x500px
- Ícono: 512x512px (ya debe estar listo)
- Privacy policy URL: requerida

### App Store (iOS)
- Nombre: BluAI (30 chars max)
- Subtítulo: (30 chars max)
- Descripción: (4000 chars max)
- Keywords: (100 chars max) — huracán, ciclón, alerta, SIAT, México
- Screenshots: iPhone 6.7" y 6.1" requeridos
- Privacy policy URL

---

## Feature 8 — Closed testing → Producción Android

**Due: May 19**

### Prerequisitos
- 14 días de closed testing completados (iniciaron con los testers actuales)
- Mínimo 12 testers activos (requisito de Google para pasar a producción)
- Sin bugs críticos sin resolver del closed testing

### Pasos
1. En Play Console → Production → Create new release
2. Subir nuevo AAB (Android App Bundle) — build de producción limpio
3. Completar release notes
4. Enviar a revisión de Google (puede tomar 24-48 hrs)

---

## Feature 10 — PR Reviewer (rol continuo)

Diego revisa **toda PR** que toque:
- Auth (Firebase, tokens, sesiones)
- DB schema (nuevas tablas, migraciones, ALTER)
- AI (endpoints, prompts, modelos)
- Navegación principal
- iOS pipeline y configuración EAS

**SLA:** 24 hrs para revisar una PR una vez asignada. Si bloqueas a Val o Edgar más de 24 hrs, el sprint se retrasa.

**Red flags a escalar inmediatamente:**
- PR > 200 líneas → pedir que se divida antes de revisar
- "Casi termino X" por 3 días seguidos → live branch review
- Alguien sin commits en 2 días → check-in directo

---

## Definition of Done (P1 completo)

- [ ] Sign in with Apple funciona en iPhone físico
- [ ] AI offline descarga y corre en device sin internet
- [ ] iOS build con APNs → push llega en iPhone físico
- [ ] Build de iOS submitted a App Store Connect
- [ ] Sentry recibiendo eventos de producción
- [ ] Keystore respaldado en ≥ 2 lugares fuera del equipo
- [ ] Store listings completos en ambas tiendas
- [ ] Build de producción Android en Play Store
- [ ] Golden path E2E verificado en device físico por Diego personalmente

---

## Out of Scope

- Native alarm-style notifications (OS-level) → Sprint 2
- Bluetooth mesh feature → v1.1 (anunciado como v1.1 en sprint philosophy)
- Revenue Cat / pagos → post-launch

---

## Extensión P2 — Email/password login

**GATE: No empezar hasta que todo P1 esté done y el build de iOS esté submitted.**

Firebase Auth ya está configurado. Agregar Email/Password provider y apple provider:
1. Firebase Console → Authentication → Email/Password → Enable
2. Frontend: pantalla de login con email/password
3. Frontend: pantalla de recuperación de contraseña (Firebase `sendPasswordResetEmail`)
4. Validaciones básicas: formato email, contraseña mínimo 8 chars
