# Sprint 3 — 22 jun → 7 jul 2026

**Ventana:** lunes 22 jun → martes 7 jul 2026 (15 días — ~10 días hábiles efectivos para part-time). *(Fechas ajustables; floor confirmado abajo.)*
**Floor:** 7 jul 2026. No se mueve.

> **Estado del doc:** los tres workstreams están definidos — Edgar (payments), Val (BT mesh), Diego (iOS). Este `sprint.md` es la fuente de verdad de las decisiones cross-cutting; el spec técnico completo de cada quien vive en su archivo personal (`edgar_sprint_3.md`, `val_sprint_3.md`, `diego_sprint_3.md`).

---

## Equipo

| Persona | Workstream |
|---|---|
| Diego | iOS → producción (submission a Apple) |
| Val | Bluetooth mesh (Android) |
| Edgar | Payments (Stripe, Spotify-style) |

---

## Estado real al 22 jun (base del sprint)

| Feature | Estado |
|---|---|
| Android en producción (Play Store, closed testing cerrado, prod access solicitado) | ✅ |
| iOS (Simulator dev, Firebase wired, SDK 54 forceStaticLinking) | 🟡 dev funciona, **sin submission** |
| Online AI en Railway (Phase 3) | ✅ |
| Nearby 1-to-1 (Google Nearby Connections) | ✅ |
| SOS in-app (receiver screen, emergency push, map flow) | ✅ |
| Bluetooth **mesh** | ❌ cero código |
| Monetización / payments | ❌ cero código |

**Huecos que ataca este sprint:** payments end-to-end (Spotify-style), iOS submission a Apple, BT mesh, bugs.

---

## Decisiones cross-cutting (seams) — válidas para todos

Estas decisiones se toman **una vez aquí** para que nadie las re-decida en su spec.

1. **iOS NO lleva UI de compra (modelo Spotify).** En iOS no hay botón de compra, ni precio, ni link a "suscríbete en la web". El app de iOS es un **desbloqueador pasivo**: lee el entitlement y abre features. La web es la única tienda. Esto evita rechazo por App Store Guideline 3.1.1 (anti-steering). Android **sí** puede abrir el navegador hacia la web.
2. **Una sola fuente de verdad del entitlement = el backend FastAPI.** iOS, Android y web leen el **mismo** `user.plan` de FastAPI. La web **no** tiene backend de pagos propio. Toda la lógica Stripe (crear sesión, webhook, entitlement) vive en `backend/app/features/subscription/`.
3. **Identidad cross-surface vía Firebase UID.** La web autentica contra el **mismo proyecto Firebase** que el app. El UID viaja a Stripe como `client_reference_id`; el webhook lo lee y marca el entitlement de esa cuenta. Sin login web no se puede mapear pago → usuario.
4. **Schema sin migration tool.** Columnas/tablas nuevas se agregan con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` dentro de `ensure_core_tables()` en `main.py`. **No Alembic.**
5. **Forma de los planes (values, not shape).** Construimos primero la **forma single-user** (un usuario → una suscripción → un quota). Los planes multi-account (Familiar) cambian la *forma* y van al final, **gated** por una decisión de diseño en semana 1.

---

## Master Task List — por prioridad

### P0 — Sprint blockers

#### 1. Payments — Stripe "Spotify-style" — *Owner: Edgar*

Suscripciones de pago vía **Stripe Checkout (hosted)**, cobradas en la **web (Next.js)**, desbloqueadas en el app. La web es la única tienda; el backend FastAPI es la fuente de verdad del entitlement.
**Spec completo:** `edgar_sprint_3.md`

**Flujo end-to-end:**
1. Usuario abre la web (en iOS por su cuenta — el app no puede linkear; en Android un botón puede abrir el navegador) y **hace login con su cuenta Firebase**.
2. Tap Suscribirse → web llama `POST /subscription/checkout` (con token Firebase) → FastAPI crea Stripe Checkout Session con `client_reference_id = uid` → regresa la URL de Stripe.
3. Redirect a la **página hosteada de Stripe** → usuario paga.
4. Stripe dispara webhook → **FastAPI** (`checkout.session.completed`, `customer.subscription.updated/deleted`) — **idempotente** y **verificado por firma de Stripe** (NO Firebase, NO api_key_auth — la firma es la auth) — marca `user.plan`.
5. App refetchea entitlement → desbloquea. iOS permanece **silencioso** sobre dónde se pagó.

**Tres superficies del workstream:**
- **A. Backend (FastAPI `subscription/`):** crear Checkout Session (UID en `client_reference_id`), webhook idempotente verificado por **firma de Stripe** (`api_key_auth` es solo para el endpoint interno `/grant` de Edu/Guard), entitlement vía `ALTER TABLE IF NOT EXISTS`, `Price` objects recurrentes (mensual + anual), Stripe Customer Portal para gestionar/cancelar.
- **B. Web (Next.js):** **Firebase Auth/login** (mismo proyecto que el app), botón Suscribirse → llama a FastAPI → redirect a Stripe, páginas de success/cancel. Sin secret keys de Stripe en la web; sin webhook en la web.
- **C. Gating en el app:** leer entitlement, bloquear features premium; **iOS sin UI de compra**; Android puede abrir la web.

**Planes — secuenciados por forma:**
- **Forma A (construir primero):** Freemium / Individual / Safe Pro — mensual + anual. Cada uno = un `Price` ID + un quota int + feature flags. *(Agregar Safe Pro tras Individual es config, no shape.)*
- **Forma B (construir al final, GATED):** Familiar / Familiar Pro — grupo + quota compartida ("bolsa compartida") + invite/join flow + add-on "persona extra $25/mes". **No empieza código hasta que la forma se defina en el gate de semana 1.**
- **Forma C (free-ride):** Edu / Guard — **grant manual de admin** (setear `user.plan`), sin checkout self-serve. Su venta es proceso comercial, no código.

**Diferido a fast-follow (NO este sprint):** **metering de quota de IA** (sección 8 del doc de monetización) — vive en el feature de AI, reventaría el scope de Edgar.

**DoD:** usuario hace login en la web con cuenta Firebase → se suscribe vía Stripe (Individual o Safe Pro, mensual o anual) → webhook marca entitlement → app desbloquea premium en device físico. iOS no muestra UI de compra. Webhook verificado idempotente (re-entrega del mismo evento no duplica estado).

---

#### 2. iOS → producción (submission a Apple) — *Owner: Diego*

Llevar iOS de "corre en Simulator dev" a **enviado a review de App Store**, con paridad funcional core. Pipeline **EAS Build + EAS Submit**. **Spec completo:** `diego_sprint_3.md`.

**Decisiones (tomadas):**
- **Techo:** submission completa a App Store. DoD = *enviado a review* (aceptación de Apple NO es parte del DoD).
- **Pipeline:** EAS Build + EAS Submit (`ascAppId 6771983891` ya en `eas.json`).
- **Paridad mínima (DoD):** Push (APNs) · Maps + SOS + Auth (incl. Sign in with Apple, Guideline 4.8) · **BT 1-a-1 (local-chat) funcional en iOS** vía MultipeerConnectivity — **1-a-1 sí, mesh NO** (la mesh iOS sigue fuera de scope). **AI on-device NO es must-have.**
- **iOS NO lleva UI de compra (seam #1 / Guideline 3.1.1).**

**DoD:** build firmado vía EAS, push real del backend llegando a iPhone físico (background/cerrado), login+maps+SOS en device, **BT 1-a-1 funcional en iOS** (no mesh), **sin UI de compra**, y build **enviado a review** en App Store Connect.

**Además en el sprint de Diego (cross-cutting, no-iOS):**
- **Bugs multi-plataforma** — dueño del pool de bugs que cruzan iOS+Android / código compartido (es el único que prueba ambas).
- **AI agent — tool use** — dar herramientas al agente de IA online (`get_current_time`/timezone, `web_search`, y reusar datos SIAT de ciclones) vía un tool-calling loop. **Lo más cortable del sprint si iOS pelea.** Detalle en `diego_sprint_3.md` (Bloques 5-6).

---

#### 3. Bluetooth mesh (Android) — *Owner: Val*

Evolucionar el chat local 1-a-1 (`frontend/app/local-chat/`) a **mesh multi-salto**: un mensaje salta de teléfono en teléfono para alcanzar devices fuera de rango directo. **Spec completo:** `val_sprint_3.md`.

**Decisiones (tomadas — Val implementa):**
- **Aditivo, no rewrite.** El `Envelope` (`id`/`to`/`ttl`) y la interfaz `LocalTransport` de `local-chat` ya están diseñados para mesh (ver comentarios en `protocol.ts` y `transport.ts`). El router de mesh es puramente aditivo.
- **Algoritmo: managed flooding** — TTL + dedup por `id` + split horizon (estándar para mesh chica offline).
- **Android vía Google Nearby Connections `P2P_CLUSTER`** (M-a-N, mesh nativo). Se **extiende** el módulo Kotlin existente — **sin librería nueva** (no Bridgefy, no BLE crudo).
- **Tres capas:** (1) Android nativo — `P2P_POINT_TO_POINT`→`P2P_CLUSTER` + peer map (**Diego parea/revisa**, mayor riesgo); (2) JS mesh router — dedup + TTL relay + split horizon (corazón, terreno de Val, lógica pura); (3) UI — sala mesh broadcast + roster de peers (directo vs por salto).

**DoD:** 3+ teléfonos Android, A y C fuera de rango directo, B en medio → mensaje de A llega a C **vía B**. (Eso prueba mesh, no 1-a-1.)

---

#### 4. Bugs — *shared, los tres*

Triage compartido: cada quien dueño de los bugs de su área + un pool común. Spec ligero en cada archivo personal.

---

## Gate de semana 1 — forma multi-account (Familiar)

**Antes de escribir una línea de código de Familiar/Familiar Pro**, se firma la forma:
- Modelo grupo → miembros (1 pagador, 2-4 perfiles)
- Quota compartida (bolsa) — semántica del contador compartido
- Invite/join flow (¿cómo se ata la cuenta del miembro al pago del pagador?)
- Add-on "persona extra $25/mes" como quantity en la suscripción Stripe

**Hasta firmar esto, Familiar no arranca.** Edgar construye Forma A en paralelo durante la semana 1.

---

## Checkpoints

- **CP1 (semana 1):**
  - ¿Forma multi-account (Familiar) firmada? (gate)
  - ¿Backend `subscription/` con Checkout Session creando sesión con UID?
  - ¿Web Next.js con login Firebase funcionando?
  - ¿Android nativo en `P2P_CLUSTER` estable? (gate de mesh — ver cut criteria #3)
  - ¿Primer `eas build --platform ios` produciendo `.ipa` firmado?
- **CP2 GO/NO-GO (semana 2):**
  - ¿Forma A end-to-end (login web → pago → entitlement → unlock en device)?
  - ¿Webhook idempotente verificado?
  - ¿Mesh demoable: A→C vía B en 3+ teléfonos?
  - ¿**Push iOS llegando a iPhone físico** + build en TestFlight → camino a submit?

---

## Cut criteria (decididos en frío)

| # | Trigger | Acción |
|---|---|---|
| 1 | Forma multi-account no firmada al cierre de semana 1 | Familiar/Familiar Pro se difiere a Sprint 4. Forma A (single-user) ships sola. |
| 2 | Webhook/entitlement no end-to-end a mid-sprint | Cortar Customer Portal y Android-link-out; focus en happy path login→pago→unlock. |
| 3 | Cambio nativo a `P2P_CLUSTER` no estable al cierre de semana 1 | Degradar mesh a POC + doc de hallazgos (válvula de regreso); el router JS se demuestra con el harness de simulación. |
| 4 | Push iOS no llega end-to-end a mid-sprint | Submit con paridad de UI (maps/SOS/auth) sin push iOS; push iOS pasa a fast-follow. El build igual se envía a review. |

---

## Fuera de scope explícitamente

- **Metering de quota de IA por plan** (sección 8 del doc de monetización) — fast-follow, vive en el feature de AI.
- **Construir Familiar antes de firmar su forma** (gate de semana 1).
- **Checkout self-serve para Edu / Guard** — son grant manual + proceso comercial.
- **IAP / StoreKit en iOS** — el modelo Spotify lo evita; decisión futura con números.
- **Dashboard de telemetría custom** — cubierto hoy por Mixpanel + Sentry; se revisita en Sprint 4.
- **iOS mesh (multi-salto)** — queda fuera; la mesh en iOS es greenfield → Sprint futuro. *(El BT **1-a-1** en iOS sí entra este sprint, en el workstream de Diego — ver tarea #2.)*
- **Cifrado / autenticación de mensajes mesh** — la mesh es sin confianza por ahora; limitación documentada, e2e es futuro.
- **Store-and-forward** (encolar para devices no alcanzables) — stretch, no MVP.
- Persistencia de mensajes mesh en backend / sync entre devices.

---

## Después del 7 jul

Reunión los tres con números reales: qué committeó cada quien, qué entregó. Define el modelo del Sprint 4.
