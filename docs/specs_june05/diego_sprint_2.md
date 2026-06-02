# Sprint 2 — Diego

**24 may → 5 jun 2026**

Spec técnico detallado de tus tasks para el sprint. Para coordinación general (timeline, checkpoints, cut criteria) → `sprint.md`.

---

## Closeout

No items específicos del sprint 1. PRs siempre se mantienen reviewed en <24h.

---

## Tu rol en este sprint

Eres infra + iOS + reviewer. **No estás owneando ningún feature MVP de Meta** — esos los hacen Val (BT) y Edgar (SOS). Tu trabajo es:

1. Desbloquear al equipo (staging, MCP, BRAND)
2. Cerrar iOS hasta 85-90% funcional
3. Mantener calidad (PR reviews)
4. Limpiar deuda (vulnerabilities, npm → pnpm)

**No absorbas tareas de los demás.** Si Val o Edgar se atrasan, primero **flag visible** (principio de accountability del sprint), después renegociación de scope con todos. No reabsorber en silencio.

---

## Feature 1 — Staging en Railway (P0)

### Goal
Segundo entorno Railway para que el equipo testee sus features sin tocar producción. **Gate de los días 1-3** — Val y Edgar dependen de esto para sus features.

### Steps

1. **Crear segundo servicio en Railway**
   - Nombre claro: `bluai-backend-staging` ✅
   - Postgres separado (NO compartir DB con prod) ✅ 
   - Misma config básica que prod, env vars distintas ✅

2. **Env vars separadas**
   - `STAGING_` prefix donde aplique, o variables completamente separadas ✅
   - `DATABASE_URL` apunta al Postgres de staging ✅ 
   - `EXPO_ACCESS_TOKEN`, Firebase keys, etc. — decidir si compartir prod o duplicar ✅

3. **Decisión Firebase: dedicated staging project vs shared** ✅
   - **Opción A:** Proyecto Firebase staging dedicado. Más limpio, datos separados, push tokens separados. 
   - **Opción B:** Proyecto único con API key separada para staging. ✅

4. **Deploy del backend** ✅
   - `railway up` desde `/backend` apuntando al servicio staging ✅
   - Verificar health endpoint
   - Verificar tablas se crearon (`ensure_core_tables` debería correr en startup)

5. **EAS config**
   - `EXPO_PUBLIC_API_URL` en `eas.json` build profiles `development` y `preview` → URL de staging
   - `production` profile sigue apuntando a prod
   - Verificar que un build EAS preview llega correctamente a staging

6. **Doc 1-pager para el equipo**
   - `docs/specs_june05/staging.md`
   - Cubrir: cuál URL es cuál, cómo cambiar entre envs en el cliente, qué hacer si staging se cae, contacto si tienen problemas

### DoD
- [ ] Servicio staging up en Railway con Postgres independiente
- [ ] EAS preview/development apuntando a staging
- [ ] Val puede testear `map_events` contra staging
- [ ] Edgar puede testear SOS push contra staging sin disparar push a usuarios reales
- [ ] Doc enviado al equipo
- [ ] Reviewed por Edgar (sanity check de que es accesible)

---

## Feature 2 — Fix vulnerabilities (P0)

### Goal
Cerrar todas las vulnerabilities active en el GitHub Security tab antes del 5 jun. **Hay 75 alerts activos al momento de planear este sprint** — no se cierran todos en un día, plan de drenaje constante a lo largo del sprint.

### Steps

1. **Triage (Día 1)**
   - Abrir https://github.com/DiegoCM1/BluEye/security
   - Las 75 alerts ordenadas por severity (critical → high → medium → low)
   - Lista de dependabot PRs abiertos
   - Marcar primer batch: los criticals y highs como prioridad cero

2. **Merge dependabot PRs verdes**
   - CI green = merge sin pensarlo mucho (son bumps de patch/minor en su mayoría)
   - Major version bumps: leer el changelog, evaluar breaking changes, decidir merge vs defer
   - Después del merge, smoke test en staging

3. **Vulns sin dependabot PR**
   - Si la vuln es en un dep que sí podemos actualizar manualmente → hazlo
   - Si es transitive y el padre no actualiza → documentar en `docs/specs_june05/vuln_punt_list.md` con razón

4. **Sweep final antes del 3 jun (feature freeze)**
   - Re-check del Security tab
   - Si quedan alerts no resueltos, mover al doc de punt list con explicación

### DoD
- [ ] Security tab limpio (0 high/critical alerts)
- [ ] Cualquier vuln no resuelta documentada con razón
- [ ] CI sigue verde después de los bumps
- [ ] Reviewed por Edgar (al menos un set de eyes secundario en los major bumps)

---

## Feature 3 — iOS hardening (P1 — 85-90% funcional)

### Goal
Llegar a 85% funcional en iPhone físico para CP2 (31 may), 90% antes del feature freeze (3 jun). App Store submission completa es Sprint 3.

### Context
- Tienes iPhone físico y dev build instalado
- APNs key todavía falta — pedirla / generarla en Apple Developer portal
- Acceso al team de Apple Developer ya desbloqueado (Héctor confirmó)
- Branch actual: `feat/ios-finish-setup`

### Pasos

1. **APNs key (Día 1)**
   - Apple Developer portal → Keys → crear nueva key con APNs habilitado
   - Subir a Expo: `eas credentials` o vía dashboard
   - Verificar push test desde notification rig de Edgar (una vez que esté ready)

2. **Bug triage (Días 1-3)**
   - Abrir cada flujo principal en device físico: login, mapa, alertas, AI chat (online + offline), notificaciones, SOS (cuando esté), BT (cuando esté)
   - Documentar cada bug visible en una lista priorizada en `docs/specs_june05/ios_bug_log.md`:
     - **P0:** flujo se rompe o crashea
     - **P1:** funcionalidad se ve mal o falta algo claramente
     - **P2:** polish (alineación, spacing, copy)

3. **Fix loop (Días 4-11)**
   - P0 primero, P1 después. P2 NO en este sprint.
   - Cada fix = un PR ≤ 400 líneas
   - Después de cada fix, re-test en device físico

4. **Métrica de progreso**
   - "Funcional" = flujo funciona sin bugs P0/P1 visibles
   - Targets:
     - CP2 (31 may): 85% = 7-8 de los 9 flujos principales sin P0/P1
     - Feature freeze (3 jun): 90% = 8-9 de los 9 flujos sin P0/P1

### DoD
- [ ] APNs key subido a Expo, push real verificado en device iOS
- [ ] iOS bug log documentado en `docs/specs_june05/ios_bug_log.md`
- [ ] 85% para CP2, 90% para feature freeze
- [ ] Diego puede demoar en iPhone físico: login + mapa + alertas + AI + push, todos sin bugs visibles
- [ ] Cada fix reviewed por Val o Edgar (rubber stamp en cosas fuera de su dominio está OK aquí)

---

## Feature 4 — PR reviews continuos (P1)

### Goal
Que ningún PR del equipo espere más de 24h por review.

### Proceso

1. **Notificación**
   - Val y Edgar te taggean en el PR cuando está listo para review
   - Configura GitHub notifications para que veas inmediatamente

2. **Aplicar el DoD del sprint**
   - PR ≤ 400 líneas
   - Tests de integración del happy path
   - Demoable en device físico
   - Firmado por el dev owner

3. **Scope de tu review**
   - Auth, DB schema, AI, notifications, navigation, iOS, infra core = TÚ revisas
   - Infra pura (CI, staging config) = el otro dev puede rubber-stamp

4. **Feedback**
   - Comentarios específicos en líneas, no en vago
   - Si hay bug bloqueante: ❌ request changes con razón clara
   - Si es polish minor: ✏️ nit comment, OK aprobar y abrir issue de followup

### Visible accountability
Este task está listado en el master plan porque es trabajo absorbido. Si Val o Edgar te apilan un retraso encima de tu review queue, **flag visible** — no absorbas en silencio.

### DoD
- [ ] Ningún PR del equipo esperó más de 24h por review durante el sprint
- [ ] Métrica al final: cuántos PRs revisaste, qué % en <24h, qué % se rechazaron en review

---

## Feature 5 — npm → pnpm migration (P1)

### Goal
Migrar `frontend/` de npm a pnpm. Motivado por problemas recientes con npm (lockfile breakage, conflictos en peer deps, instalaciones inconsistentes entre máquinas).

### Steps

1. **Pre-checklist**
   - `frontend/package-lock.json` actual checkeado en git
   - CI verde antes de empezar (es tu baseline)
   - Coordinar con Val y Edgar: nadie commitea durante la migración (~2-4h)

2. **Migración**
   - `cd frontend && rm -rf node_modules package-lock.json`
   - `pnpm import` (lee package-lock.json y genera pnpm-lock.yaml — preserva versiones exactas)
   - `pnpm install`
   - Si hay errores de peer deps, resolver caso por caso (pnpm es más estricto que npm)

3. **EAS config**
   - Quitar `NPM_CONFIG_LEGACY_PEER_DEPS` de `eas.json` (no aplica con pnpm)
   - Agregar comando custom si EAS necesita pnpm explícito (`pnpm install` en lugar de default npm)
   - Revisar `eas.json` build profiles

4. **CI**
   - GitHub Actions: cambiar `npm ci` → `pnpm install --frozen-lockfile`
   - Cache key: cambiar de `package-lock.json` a `pnpm-lock.yaml`

5. **Test**
   - Local: `pnpm dev`, app levanta
   - EAS preview build: verde
   - CI build: verde

6. **Cleanup**
   - Borrar `package-lock.json` definitivamente
   - Actualizar README con comandos pnpm

### DoD
- [ ] `frontend/pnpm-lock.yaml` committed, `package-lock.json` borrado
- [ ] EAS preview build verde con pnpm
- [ ] CI verde
- [ ] Val y Edgar saben que ahora se usa `pnpm` (avisar antes del merge)
- [ ] Reviewed por Val o Edgar (al menos rubber stamp)

---

## Feature 6 — Skills + BRAND + MCP setup (P1) ✅

### Goal
Que todos los integrantes tengan el mismo contexto Claude y sigan los mismos lineamientos de frontend. ✅

### Steps

1. **`docs/BRAND.md` — actualizar con guidelines frontend**
   - Colores (palette, primary, accent, semantic — error/warning/success)
   - Tipografía (familias, sizes, weights, line heights)
   - Spacing (sistema de 4u o 8u — defínelo)
   - Naming conventions (file naming, component naming, hook naming)
   - Patrones de componentes (cuándo usar shadcn-style RNR, cuándo NativeWind directo)
   - Ejemplos de "do" / "don't"

2. **`CLAUDE.md` per-project**
   - Reglas de codebase que Claude debe seguir
   - Apuntar a BRAND.md
   - Reglas de cuándo usar inline styles vs NativeWind
   - Patterns internos (feature-based folders, naming de servicios, etc.)

3. **Skills shared**
   - Setup replicable: instalar Claude Code, jalar el repo, copiar settings
   - Skills relevantes para el equipo (verify, code-review, run)

4. **MCP wiring a docs oficiales**
   - React Native (https://reactnative.dev/docs)
   - Android (https://developer.android.com/reference)
   - Firebase docs
   - iOS (https://developer.apple.com/documentation/)
   - Expo (https://docs.expo.dev/)
   - Investigar si hay MCP servers existentes para cada o si hay que configurar fetch-based
   - Documentar el setup en un doc del proyecto

### DoD
- [✅] `docs/BRAND.md` actualizado con todas las secciones
- [✅] `CLAUDE.md` del proyecto puesto al día
- [ ] Setup doc para que Val y Edgar repliquen su environment de Claude
- [ ] Val y Edgar confirman que su Claude tiene el mismo contexto que el tuyo

---

## Feature 7 — Mixpanel tracking verification (P1 — ride-along)

### Goal
Confirmar que el tracking de Mixpanel realmente funciona end-to-end. **Ride-along: solo si todo lo demás va en tiempo. Si CP2 es rojo, este se cae.**

### Steps

1. **Token verification**
   - Token está en `eas.json` (`EXPO_PUBLIC_MIXPANEL_PROJECT_TOKEN: 0f9403...`)
   - Build de producción → verificar que el token llega al device
   - Confirmar que `mixpanel-react-native` se inicializa sin errores

2. **Event trigger desde device real**
   - Llevar la app a producción / preview en device
   - Triggear eventos conocidos:
     - `login` al loggearte
     - `alert_received` al recibir un push
     - `alert_opened` al tap del push
     - `sos_triggered` al activar SOS (cuando esté listo)
     - `bt_message_sent` al mandar mensaje BT (cuando esté listo)

3. **Verification en dashboard de Mixpanel**
   - Login a Mixpanel
   - Live Events o Events
   - Confirmar que cada evento llega con properties correctas
   - Documentar lag (Mixpanel suele tener delay de segundos a minutos)

4. **Event taxonomy doc**
   - `docs/specs_june05/mixpanel_taxonomy.md`
   - Lista de eventos esperados, properties, cuándo se disparan, qué info llevan
   - Para que cuando agreguen eventos nuevos, sigan la convención

### DoD
- [ ] Eventos conocidos aparecen en Mixpanel dashboard desde device de producción
- [ ] Doc de event taxonomy escrito
- [ ] Reviewed por Edgar (es el que hereda mantenimiento de tracking)

---

## Trabajo paralelo (no sprint-scoped)

Listado para visibilidad — **NO** P0/P1.

- Polish del chat AI (mejoras en `frontend/app/ai/`)
- Otras pantallas / features menores del frontend (lo que vayas notando que sale del flow)
- Optimización general (FlashList, memoization, lazy loads)

Estos se rolean si queda tiempo. Si aparecen PRs tuyos sobre estos temas, el equipo sabe que no salieron de la nada — están aquí.

**Regla:** ningún PR de trabajo paralelo merge si interrumpe trabajo P0/P1 del equipo. Si la review queue está creciendo, paralelo se pausa.

---

## Out of Scope (Sprint 3+)

- App Store submission completa
- ghstack / Graphite tooling para PR management
- Migración GCP / staging en otra cloud
- AI screen polish del RoadMap (3-dot typing, cancel offline download, etc.)
- Native alarm-style notifications

---

## Capacidad — mira la math antes de empezar

Full-time ≈ 14 días × ~7h efectivas = ~100h disponibles.

Estimaciones:
- Staging: ~10-15h
- Vulnerabilities: ~3-8h
- iOS hardening: ~15-25h (depende de qué tan jodido esté el bug log)
- PR reviews: ~5-10h (continuo)
- npm → pnpm: ~3-6h
- Skills + BRAND + MCP: ~6-10h
- Mixpanel: ~2-4h

**Total: 44-78h formal + paralelo + reacciones a surpresas + ayuda al equipo.**

Encaja en papel, sin slack. **El principio de accountability visible aplica a ti también** — si tu queue empieza a tronar, no absorbas más; flag al grupo.
