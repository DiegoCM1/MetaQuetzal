# Sprint 3 — Edgar

**22 jun → 7 jul 2026**

Spec técnico detallado de tu feature para el sprint: **Payments (Stripe, modelo Spotify)**. Para coordinación general (timeline, checkpoints, cut criteria, seams) → `sprint.md`. **Lee primero las "Decisiones cross-cutting (seams)" de `sprint.md` — ahí están las 5 decisiones que NO se re-deciden aquí.**

---

## Feature — Payments "Spotify-style" (P0)

### Goal

Suscripciones de pago cobradas en la **web (Next.js)** vía **Stripe Checkout hosteado**, desbloqueadas en el app. La web es la única tienda; el **backend FastAPI es la única fuente de verdad** del entitlement. iOS, Android y web leen el mismo `plan` del backend.

El usuario hace login en la web con su cuenta Firebase, paga en Stripe, el webhook marca su entitlement, y el app desbloquea premium. **iOS nunca muestra UI de compra** (evita rechazo por Guideline 3.1.1).

### Context

**Lo que ya existe:**
- `backend/app/features/<name>/` patrón router + service + schemas
- Auth Firebase vía `app.core.firebase` (ver `map_events/router.py`)
- `middleware/api_key_auth` para endpoints internos
- `ensure_core_tables()` en `main.py` para schema (NO Alembic)
- Web Next.js con **frontend de planes ya hecho, sin backend ni auth**

**Lo que falta (todo):**
- Backend: feature `subscription/` completo (checkout, webhook, entitlement, portal, grant)
- Web: login Firebase + glue de checkout (llamar al backend + redirect)
- App: leer entitlement + gating de features premium

### Forma de los planes — IMPORTANTE (ver seam #5)

- **Forma A (este sprint, construir primero):** Freemium / **Individual** ($69/mes, $690/año) / **Safe Pro** ($99/mes, $990/año). Forma `1 usuario → 1 suscripción → 1 plan`. Agregar Safe Pro tras Individual = **un Price ID + valores**, no shape.
- **Forma B (GATED — solo si se firma el gate de semana 1):** Familiar / Familiar Pro. Grupo + bolsa compartida. **No empieza código hasta firmar la forma.** Ver `sprint.md` → "Gate de semana 1".
- **Forma C (free-ride):** Edu / Guard = **grant manual de admin** (endpoint interno), sin checkout self-serve.

---

## Backend — `backend/app/features/subscription/`

### 1. Schema — dos tablas

Agregar en `ensure_core_tables()` en `main.py`, mismo patrón que las demás.

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
    id                     SERIAL PRIMARY KEY,
    user_id                BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id     VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan                   VARCHAR(50)  NOT NULL DEFAULT 'freemium',  -- freemium|individual|safe_pro|edu|guard
    status                 VARCHAR(50)  NOT NULL DEFAULT 'inactive',  -- active|past_due|canceled|inactive
    interval               VARCHAR(20),                               -- month|year
    current_period_end     TIMESTAMPTZ,
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

```sql
-- Idempotencia del webhook: registra cada evento Stripe ya procesado.
CREATE TABLE IF NOT EXISTS stripe_events (
    id          VARCHAR(255) PRIMARY KEY,   -- event.id de Stripe (evt_...)
    type        VARCHAR(100) NOT NULL,
    received_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

> `subscriptions.user_id` es **UNIQUE** porque la Forma A es una sub por usuario. La Forma B (Familiar) rompe esto (grupo) — por eso está gated; no la fuerces aquí.

### 2. Config — Price IDs por env

Mapa `(plan, interval) → Stripe Price ID`. Los Price IDs viven en `backend/.env` (secrets, gitignored), NO hardcodeados:

```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_INDIVIDUAL_MONTH=price_...
STRIPE_PRICE_INDIVIDUAL_YEAR=price_...
STRIPE_PRICE_SAFE_PRO_MONTH=price_...
STRIPE_PRICE_SAFE_PRO_YEAR=price_...
```

Los `Price` objects (recurrentes, mensual y anual) se crean **una vez** en el dashboard de Stripe (o por script) — agrégalos a `backend/.env.example` (sin valores) para documentar.

### 3. Endpoints — y qué auth usa cada uno (LEE ESTO)

La auth **no es la misma** en todos. Confundirla es el error clásico:

| Endpoint | Auth | Por qué |
|---|---|---|
| `POST /api/v1/subscription/checkout` | Firebase | el usuario logueado pide su sesión de pago |
| `GET  /api/v1/subscription/me` | Firebase | el app lee su propio entitlement |
| `POST /api/v1/subscription/portal` | Firebase | el usuario gestiona/cancela |
| `POST /api/v1/subscription/webhook` | **Stripe signature** | server-to-server; la firma ES la auth |
| `POST /api/v1/subscription/grant` | **api_key_auth** | grant manual interno (Edu/Guard) |

> **El webhook NO va detrás de Firebase ni de api_key_auth.** Su seguridad es la **verificación de firma** de Stripe (`stripe.Webhook.construct_event` con `STRIPE_WEBHOOK_SECRET`). Tiene que ser una ruta pública que Stripe pueda alcanzar. `api_key_auth` es solo para `/grant`.

**`POST /subscription/checkout`** (Firebase)
- Body: `{ "plan": "individual"|"safe_pro", "interval": "month"|"year" }`
- Lógica:
  1. Buscar/crear el `subscriptions` row del usuario; crear Stripe Customer si no tiene `stripe_customer_id` (guardarlo).
  2. Resolver el Price ID desde `(plan, interval)`.
  3. Crear Checkout Session: `mode="subscription"`, `customer=<stripe_customer_id>`, `client_reference_id=<user_id>`, `line_items=[{price, quantity:1}]`, `success_url`, `cancel_url`.
  4. **`client_reference_id` es el puente pago→usuario. Sin él no sabes a quién acreditar.**
- Response 200: `{ "url": "https://checkout.stripe.com/..." }`
- Errores: `422` plan/interval inválido.

**`GET /subscription/me`** (Firebase)
- Response: `{ "plan": "individual", "status": "active", "interval": "month", "current_period_end": "2026-08-05T..." }`
- Es lo que el app consulta para gating. Si no hay row → `{ "plan": "freemium", "status": "inactive" }`.

**`POST /subscription/portal`** (Firebase)
- Crea Stripe Billing Portal Session para el `stripe_customer_id` del usuario. Response: `{ "url": ... }`.

**`POST /subscription/webhook`** (Stripe signature)
- Verificar firma con `STRIPE_WEBHOOK_SECRET`. Firma inválida → `400`.
- **Idempotencia:** `INSERT INTO stripe_events (id, type) VALUES (...) ON CONFLICT (id) DO NOTHING`. Si no insertó (ya existía) → return `200` no-op inmediatamente. Stripe **reenvía** el mismo evento; sin esto, doble-procesas.
- Manejar:
  - `checkout.session.completed` → leer `client_reference_id` → set `plan` (del Price), `status="active"`, guardar `stripe_subscription_id`, `interval`, `current_period_end`.
  - `customer.subscription.updated` → actualizar `status` (`active`/`past_due`) + `current_period_end` (renovaciones).
  - `customer.subscription.deleted` → `status="canceled"`, `plan="freemium"`.
- Responder `200` rápido (Stripe reintenta si tarda/falla).

**`POST /subscription/grant`** (api_key_auth — interno)
- Body: `{ "user_id": int, "plan": "edu"|"guard"|... }`. Setea el plan directo (Edu/Guard). Sin Stripe.

### 4. SDK

Usar el paquete oficial `stripe` (Python). Agregarlo a `requirements.txt`. **Antes de implementar, valida la API actual del SDK con Context7** (las firmas de `checkout.Session.create` / `Webhook.construct_event` cambian entre versiones).

---

## Web — Next.js

El frontend de planes ya existe. Falta el plumbing:

### 1. Firebase Auth (mismo proyecto que el app)
- Config web de Firebase (pública — `NEXT_PUBLIC_FIREBASE_*`). Login (email/password o el provider que use el app).
- **Debe ser el MISMO proyecto Firebase** que el app, o el UID no coincide y el pago no mapea a la cuenta.

### 2. Botón Suscribirse → checkout
- Al tap: obtener el **Firebase ID token** del usuario logueado → `fetch(POST {API_URL}/subscription/checkout, Authorization: Bearer <token>, body {plan, interval})` → `window.location = response.url` (redirect a Stripe).
- `API_URL` = la base del backend FastAPI (Railway). Nunca metas la secret key de Stripe en la web.

### 3. Páginas de retorno
- `/success` — "Suscripción activa, vuelve a la app." (El entitlement ya lo marcó el webhook, no esta página.)
- `/cancel` — "Pago cancelado."

---

## App (mobile) — gating

### 1. Hook de entitlement
- `useEntitlement()` → SWR sobre `GET /subscription/me` (vía `authFetch`, ver `frontend/utils/api.ts`).
- Expone `{ plan, isPremium, status }`.

### 2. Gating de features premium
- Bloquear las features premium según `plan`. (Lista exacta de qué desbloquea cada plan = decisión de producto con Diego; por ahora gate binario freemium vs pagado.)

### 3. iOS vs Android — DIFERENTE (seam #1)
- **iOS:** feature premium bloqueada muestra estado locked **sin** botón de compra, **sin** precio, **sin** link a la web. Silencio total. (Modelo Spotify.)
- **Android:** puede mostrar un botón "Suscríbete" que **abre la web en el navegador** (`Linking.openURL(WEB_URL)`).

### 4. ¿Cómo sabe el app que ya pagué? (el gap)
El pago ocurre en la web; el app no recibe callback directo. Solución simple y robusta:
- **Refetch del entitlement cuando el app vuelve a foreground** (`AppState` change) + al montar la pantalla de gating.
- Botón "Actualizar / Ya pagué" que fuerza el refetch.
- No deep-link de retorno (iOS no lo permite limpio). Polling on-foreground es suficiente.

---

## Tests (integración, happy path)

- `checkout` crea sesión con `client_reference_id == user_id`.
- Webhook con firma válida + `checkout.session.completed` → `plan` y `status=active` en `subscriptions`.
- **Idempotencia:** mismo `event.id` dos veces → estado se setea **una** vez, segunda llamada `200` no-op.
- Webhook con firma inválida → `400`.
- `GET /me` refleja el plan tras el webhook.

> Recuerda: `backend/conftest.py` stubea `firebase_admin`. Para Stripe, mockea el SDK (no llames a Stripe real en tests).

---

## Estrategia de PRs (≤ 400 líneas cada uno)

1. **Backend base** — tablas `subscriptions` + `stripe_events` en `ensure_core_tables()`, config de Price IDs, `GET /subscription/me`, setup del SDK.
2. **Backend checkout** — `POST /checkout` (crear customer + session con `client_reference_id`).
3. **Backend webhook** — verificación de firma, idempotencia, los 3 eventos.
4. **Web Next.js** — login Firebase + botón → checkout → redirect + páginas success/cancel.
5. **Mobile gating** — `useEntitlement` + bloqueo premium + Android link-out (iOS silencioso).
6. **Backend portal + grant** — Billing Portal + `/grant` interno (Edu/Guard). (PR chico.)
7. **(GATED) Familiar** — solo si se firmó el gate de semana 1. Grupo + bolsa compartida + invite flow. Spec aparte si se activa.

---

## DoD

- [ ] Tablas `subscriptions` + `stripe_events` se crean al iniciar el backend
- [ ] `POST /checkout` crea Checkout Session con `client_reference_id = user_id`
- [ ] Webhook verifica firma de Stripe (firma inválida → 400)
- [ ] Webhook **idempotente** (mismo `event.id` no duplica estado) — test que lo prueba
- [ ] Webhook maneja `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] `GET /me` refleja el entitlement
- [ ] Web: login Firebase (mismo proyecto) + botón → redirect a Stripe + success/cancel
- [ ] App: gating premium leyendo `/me`
- [ ] **iOS sin UI de compra** (sin botón, sin precio, sin link); Android abre la web
- [ ] Refetch de entitlement on-foreground
- [ ] Endpoint `/grant` interno (Edu/Guard) detrás de api_key_auth
- [ ] Billing Portal funcional (gestionar/cancelar)
- [ ] ≥1 test de integración happy path + test de idempotencia
- [ ] Demoable en device físico: login web → pago Stripe (test mode) → app desbloquea
- [ ] PR(s) ≤ 400 líneas, reviewed por Diego

---

## Out of Scope (este sprint)

- **Metering de quota de IA por plan** (sección 8 del doc de monetización) → fast-follow, vive en el feature de AI
- **Familiar / Familiar Pro** si no se firma el gate de semana 1
- **Checkout self-serve para Edu / Guard** (solo grant manual)
- IAP / StoreKit en iOS
- Proration / upgrade-downgrade entre planes, Stripe Tax, multi-currency
- Promos de temporada (hibernación, reactivación) — son config de Price/coupon, post-sprint

---

## Capacidad — mira la math antes de empezar

~10 días hábiles × 3-4h = **30-40h**.
- Backend (`subscription/` completo: tablas, checkout, webhook, portal, grant): ~15-20h
- Web Next.js (login Firebase + glue): ~8-10h
- Mobile gating: ~6-8h
- Tests: ~4h

**Total ~33-42h en budget de 30-40h. Tight.** Los dos puntos donde más se pelea:
1. **Firebase Auth en la web** apuntando al mismo proyecto que el app (config + provider matching).
2. **Verificación de firma del webhook** (testear con `stripe listen` / CLI local).

Si cualquiera de esos dos pelea más de 1 día, **flag visible en el grupo el día 3.** No absorbas en silencio (principio operativo #2). La válvula de regreso existe: si no llegas, Forma A sola es un ship válido — Familiar y portal se difieren.
