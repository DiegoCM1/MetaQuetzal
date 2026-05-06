# Lanzamiento + iOS + Coordinación — Diego

## Resumen de tareas

### P1 — Must-Have (bloqueantes para v1.0)

| # | Feature / Tarea | Mini-deadline | Standard |
|---|---|---|---|
| 1 | Sign in with Apple — Firebase Apple provider | May 6 | E2E + Test + Device |
| 2 | iOS offline AI — Llama on-device confiable | May 11 | Funciona en device físico sin internet |
| 3 | iOS pipeline: certs, APNs, EAS build, App Store Connect | May 13 | Build corriendo en iPhone físico |
| 4 | Sentry en producción — telemetría de crashes | May 14 | Evento visible en dashboard |
| 5 | Frontend general fixes — pantallas y navegación | Continuo | Sin crashes en golden path |
| 6 | Keystore de producción asegurado y respaldado | May 16 | Backup verificado fuera del equipo |
| 7 | Store listings — Play Store + App Store (temporada huracanes) | May 16 | Revisado y publicado |
| 8 | Closed testing → producción Android (Play Store) | May 19 | Build en producción |
| 9 | Submission iOS a App Store Connect | May 18 | Submitted, en revisión |
| 10 | PR reviewer — toda PR crítica del sprint | Continuo | Sin merge sin tu revisión |

### P2 — Extensión (solo si P1 completo)

| # | Feature |
|---|---|
| 11 | Email/password login + password recovery |

---

## Contexto

Diego es el único full-time. Lleva el peso de lo que no perdona: Apple, Play Store, certificados, telemetría. Si falla, no hay app en la tienda. Además, es el revisor final — la calidad de `main` pasa por sus manos.

**Posible iOS hire:** si se contrata al senior antes del día 13, puede tomar el pipeline de App Store Connect (certs, provisioning, submission). Diego mantiene supervisión pero delega la ejecución. Planear sin él. Si aparece, es upside.

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
- [ ] Sentry inicializado en la app
- [ ] DSN en variables de entorno (no hardcodeado)
- [ ] Evento de prueba visible en Sentry dashboard
- [ ] Source maps subidos para que los stack traces sean legibles

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

Firebase Auth ya está configurado. Agregar Email/Password provider:
1. Firebase Console → Authentication → Email/Password → Enable
2. Frontend: pantalla de login con email/password
3. Frontend: pantalla de recuperación de contraseña (Firebase `sendPasswordResetEmail`)
4. Validaciones básicas: formato email, contraseña mínimo 8 chars
