# Sprint 2 — 24 may → 5 jun 2026

**Ventana:** sábado 24 may → jueves 5 jun 2026 (14 días — ~10 días hábiles efectivos para part-time).
**Floor:** 5 jun 2026. No se mueve. Si no shippeamos esto, perdemos la ventana de inicio de temporada.

---

## Equipo y modelo de trabajo

| Persona | Disponibilidad |
|---|---|
| Diego | Full-time |
| Val | Part-time (~3-4h/día) |
| Edgar | Part-time (~3-4h/día) |

### Principios operativos — leer dos veces

Esto cambia respecto a sprints anteriores. No es retórica, es la forma de trabajar.

**1. Carga escalada a capacidad.**
Cada quien recibe una porción proporcional a sus horas.

**2. Accountability visible.**
Si tu feature se va a retrasar, lo dices en el grupo **lo antes posible**. No esperes a que pregunten. No esperes a que alguien lo recoja sin avisar. **Scope retrasado = scope visible.** Permite reasignar a tiempo. Las cosas se rompen cuando los problemas son invisibles, no cuando existen.

**3. Diego revisa los PRs.**
Toda PR que toque auth, DB schema, AI, notifications, navigation, iOS o infra core (en este sprint = prácticamente todo) la revisa Diego. **Turnaround objetivo: 24h.** Esto es trabajo absorbido — si Diego está revisando tu PR, no apiles encima un feature retrasado. PRs de infra pura (staging, CI) las puede rubber-stampear el resto.

**4. Definition of Done** (no negocia):
- End-to-end funcional — backend + frontend integrados
- Tests de integración del happy path
- Demoable en device físico (no localhost, no simulador)
- Firmado por el dev owner + reviewed por Diego
- PR ≤ 400 líneas — features grandes = múltiples PRs

---

## (23 may) — Cierre del sprint anterior

Estas tareas **NO cuentan para el sprint nuevo.** Si no mergean hoy, se posponen — no se cuelan al scope nuevo.

- [ ] **Val** — corregir y mergear PR de P2 (Waze-style voting)
- [ ] **Val** — agregar tests de integración para `map_events` (era parte del DoD original de su feature en `specs_may20/val.md`)
- [ ] **Edgar** — terminar tweaks locales + mergear PR de quiet hours

---

## Estado real al 23 may (verificado contra el código)

| Feature prometida a Meta | Estado |
|---|---|
| IA Empática offline (LLaMA on-device) | ✅ Funcionando en producción Android |
| Geolocalización SIAT-CT | ✅ Sólido |
| Integración CONAGUA / OpenWeather / MapBox | ✅ Sólido |
| Bluetooth (1-to-1) | ❌ Cero código |
| iOS + Android | 🟡 Android en producción, iOS en testing |
| Botón SOS → red de apoyo | 🟡 Backend parcial en `future_integration/`, no wired, sin frontend |
| IA entrenada con fuentes oficiales (RAG) | ✅ Sólido |

**Huecos reales del sprint:** Bluetooth, SOS, infra (staging + test rig), pendientes de mapa de Val, iOS demoable.

---

## Master Task List — por prioridad

Resumen por task. **El spec técnico completo vive en el archivo personal del owner** (`val_sprint_2.md`, `edgar_sprint_2.md`, `diego_sprint_2.md`).

### P0 — Sprint blockers (caen antes del 5 jun o el sprint falla)

#### Features MVP prometidos a Meta

**1. Bluetooth 1-to-1 text exchange** — *Owner: Val*
Mensajería directa entre 2 teléfonos vía BLE. Sin internet, sin mesh, sin backend. Entry point: toggle en la pantalla de chat AI.
**Spec:** `val_sprint_2.md`
**DoD:** demoable con 2 teléfonos físicos intercambiando texto sin internet.

**2. SOS full in-app** — *Owner: Edgar*
Botón SOS que dispara push geolocalizado a la red de apoyo del usuario. Ya hay trabajo previo de Edgar — continuar.
**Spec:** `edgar_sprint_2.md`
**DoD:** usuario A triggerea SOS, usuarios B y C de su red reciben push con la ubicación de A.

#### Infra (días 1-3 — gate para que el resto pueda trabajar)

**3. Staging en Railway** — *Owner: Diego* Thank you.
Segundo entorno Railway para que el equipo testee sus features sin tocar producción.
**Spec:** `diego_sprint_2.md`
**DoD:** Val y Edgar pueden testear sus features contra staging sin tocar producción.

**4. Notification test rig** — *Owner: Edgar*
Endpoint admin + dev panel para disparar pushes de prueba (SIAT levels, SMN alerts, SOS) sin esperar un huracán real. Edgar es responsable end-to-end del rig para SIAT y SMN también.
**Spec:** `edgar_sprint_2.md`
**DoD:** cualquiera del equipo dispara y verifica push end-to-end en su device en <2min.

#### Pendientes de mapa + seguridad

**5. Map events offline write queue + MapMarker OOM** — *Owner: Val*
Cola MMKV para creates de eventos que fallan offline + fix embedded de MapMarker OOM con `tracksViewChanges={false}`.
**Spec:** `val_sprint_2.md`
**DoD:** crear evento sin internet → cola → reconectar → se sube. Mapa con muchos markers ya no crashea.

**6. Fix vulnerabilities** — *Owner: Diego*
Cerrar vulnerabilities del GitHub Security tab y dependabot PRs activos (75 en total)
**Spec:** `diego_sprint_2.md`
**DoD:** Security tab de GitHub limpio (0 high/critical alerts).

---

### P1 — Should-have (se cortan solo si P0 visiblemente atrasado mid-sprint)

**7. iOS hardening — 85-90% funcional** — *Owner: Diego*
Bug triage + fix en iPhone físico hasta 85% para CP2, 90% para feature freeze. Obtener APNs key. No es App Store submission.
**Spec:** `diego_sprint_2.md`
**DoD:** Diego demoa en iPhone físico — login, mapa, alertas, AI, push — sin bugs visibles bloqueantes.

**8. PR reviews continuos** — *Owner: Diego*
Review de todos los PRs del equipo en <24h, aplicando el DoD del sprint.
**Spec:** `diego_sprint_2.md`
**DoD:** ningún PR del equipo espera más de 24h por review.

**9. `npm → pnpm` migration** — *Owner: Diego*
Migrar `frontend/` de npm a pnpm. Motivado por problemas recientes con npm (lockfile breakage, conflictos en peer deps).
**Spec:** `diego_sprint_2.md`
**DoD:** EAS preview build verde con pnpm; nadie usa npm en el repo después del merge.

**10. Skills + BRAND + MCP setup** — *Owner: Diego*
Actualizar `docs/BRAND.md` con guidelines frontend + config skills/CLAUDE.md compartido + wire MCPs a docs oficiales (RN, Android, Firebase, iOS, Expo).
**Spec:** `diego_sprint_2.md`
**DoD:** Val y Edgar pueden replicar el setup en su máquina con instrucciones del doc.

**11. Mixpanel tracking verification** — *Owner: Diego* (ride-along — solo si todo lo demás va en tiempo)
Verificar end-to-end que eventos llegan al dashboard de Mixpanel desde build de producción.
**Spec:** `diego_sprint_2.md`
**DoD:** eventos conocidos aparecen en Mixpanel desde device real; event taxonomy documentada.

---

### Trabajo paralelo de Diego (no sprint-scoped)

Listado para visibilidad: polish del chat AI, otras pantallas / features menores, optimización general. NO son P0/P1. Se rolean si queda tiempo. Detalles en `diego_sprint_2.md`.

---

## Checkpoints

- **28 may — CP1**
  - ¿Staging accesible para el equipo?
  - ¿Notification test rig funcional?
  - ¿APNs key obtenida?
  - ¿iOS triage hecho?

- **31 may — CP2 GO/NO-GO**
  - ¿Bluetooth demoable entre 2 phones?
  - ¿SOS triggereable end-to-end?
  - ¿iOS 85%?
  - Si 2 de 3 están rojos → activar cut criteria (ver abajo).

---

## Cut criteria (decididos en frío, no en el momento)

| # | Trigger | Acción |
|---|---|---|
| 1 | Bluetooth bloqueado por permisos o compat después del 31 may | Documentar el bloqueo, defender el feature como "v1.1" en la conversación con Meta |
| 2 | iOS por debajo de 70% funcional al 31 may | Cortar polish, focus solo en flujos demoables (login + mapa + push). 85-90% se posterga a Sprint 3 |
| 3 | SOS no demoable al 31 may | Reducir scope: trigger + share-sheet a contactos del teléfono, sin red de apoyo en backend |
| 4 | Sessions sin crash < 98% el día 4 jun | Delay del Android update — no se publica hasta verde |

---

## Fuera de scope explícitamente

- Bluetooth mesh (deferido a v1.1 — conversación con Meta pendiente)
- **Persistencia de mensajes BT en backend / sync entre devices** (Sprint 3+ — es otro producto, no MVP)
- iOS App Store submission completa (Sprint 3 — este sprint solo hardening hasta 85-90% funcional en device)
- Quiet hours / preferencias avanzadas (cerró en sprint anterior)
- Voting Waze-style (cerró en sprint anterior)
- Revenue Cat / pagos (post-launch)
- Native alarm-style notifications (Sprint 3+)
- AI screen polish del RoadMap (Sprint 3+)
- Known gaps del RoadMap restantes (offline AI download non-resumable, etc.)

---

## Timeline — qué cae en qué día

Plan día a día. Los checkpoints arriba son momentos de evaluación; esto es el plan de trabajo.

### 24-26 may (sáb-lun) — Día 1-3: Foundation

El equipo no puede empezar sus features hasta que la base esté lista. Diego desbloquea.

- **Diego**
  - Staging Railway up (2do servicio + Postgres + env vars)
  - EAS `development` y `preview` apuntando a staging
  - Doc 1-pager de "cómo usar staging" enviado al equipo
  - Pedir / generar APNs key (Apple Developer portal)
  - npm → pnpm migration (antes de que el equipo agregue más deps)
  - Vulnerability sweep inicial: review Security tab + merge dependabot PRs verdes
- **Val**
  - Install `react-native-ble-plx`, configurar permisos Android/iOS
  - Setup esqueleto del toggle en chat AI screen
  - Map offline write queue (paralelo, no necesita staging)
- **Edgar**
  - Rewire `future_integration/sos/` a Firebase Auth (eliminar password_hash)
  - Tabla `support_network` + schema
  - Wire del router en `main.py` contra staging

### 27-28 may (mar-mié) — Día 4-5: CP1

Foundation lista. Features arrancan a fondo.

- **Diego**
  - Skills + BRAND + MCP setup (doc + config)
  - iOS bug triage: lista priorizada en device físico
  - Empieza a arreglar bugs principales
- **Val**
  - BT lobby funcional (toggles "Soy visible" + "Buscar gente", scan list, conversaciones previas)
  - Editor de nickname (modal)
- **Edgar**
  - SOS endpoints: agregar/eliminar contactos de red
  - Trigger SOS dispara push a la red (usa `_push_per_user`)
  - Notification test rig: endpoint admin + dev panel en Settings
- **28 may — CP1:** ¿staging accesible? ¿test rig funcional? ¿APNs key obtenida? ¿iOS triage hecho?

### 29-31 may (jue-sáb) — Día 6-8: CP2 GO/NO-GO

Features tienen que estar demoables end-to-end.

- **Diego**
  - iOS bugs principales arreglados — target **85% funcional para CP2**
  - Push real en iOS verificado con APNs key configurada
- **Val**
  - BT chat per-persona (burbujas, send/receive sobre GATT, status por mensaje)
  - Colisión de nicknames + persistencia MMKV
- **Edgar**
  - SOS frontend: botón, modal de confirmación, pantalla de gestión de red
  - SOS demoable end-to-end (A triggerea → B y C reciben push con ubicación)
  - Tests de integración happy path
- **31 may — CP2 GO/NO-GO:** ¿BT demoable entre 2 phones? ¿SOS end-to-end? ¿iOS 85%? Si 2 de 3 rojos → cut criteria.

### 1-3 jun (dom-mar) — Día 9-11: Edge cases + hardening

No features nuevos. Solo cerrar.

- **Diego**
  - iOS polish final → target **90% funcional**
  - Mixpanel verification end-to-end + event taxonomy doc
  - Vulnerability sweep final: Security tab limpio
- **Val**
  - BT edge cases: out-of-range queue, bloqueo, first-contact banner
  - Map fixes mergeados con DoD verde
- **Edgar**
  - SOS edge cases: red vacía, peer sin token, fallo de push
  - Tests adicionales si quedan huecos en cobertura
- **3 jun — FEATURE FREEZE.** Después de esta fecha, solo bug fixes.

### 4-5 jun (mié-jue) — Día 12-13: QA + ship

- **4 jun — QA day**
  - Cross-testing en device físico: Val testea SOS, Edgar testea BT, Diego testea todo en iOS
  - Sentry dashboard check: sessions sin crash ≥ 98%
  - Demo dry-run encadenando los flows principales
  - Reportar bugs encontrados, fix-only commits permitidos
- **5 jun — SHIP**
  - Backend deploy a producción (Railway prod)
  - Android build firmado + subido a Play Store
  - iOS demo build en iPhone físico de Diego (no submission, ese es Sprint 3)
  - Notificar a Meta con el estado real de cada feature

---

## Después del 5 jun

Reunión los tres, con números reales sobre la mesa:
- Qué committeó cada quien
- Qué entregó cada quien
- Qué absorbió Diego

Esa conversación define el modelo de trabajo del Sprint 3 — incluyendo equity, pago, y división futura. **No se adelanta — primero shippeamos.**
