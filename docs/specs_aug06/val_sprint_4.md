# Sprint 4 — Val

**6 ago → 14 ago 2026**

Spec técnico de tu semana: **la cadena completa de dinero** — cobrar en la web, leer el plan en la app, y que la membresía familiar funcione. Para coordinación general (orden, checkpoints, cut criteria) → `sprint.md`.

**Tu semana es la más cargada del sprint.** Tres cosas que hoy **no funcionan en absoluto** y todas son de ingreso. Por eso el orden de abajo importa más que la velocidad.

---

## Orden de la semana

1. **Cerrar el hueco de datos** (~0.5 día) — va **antes** que los planes, porque los planes son permisos
2. **Cobros en el sitio web** — el grueso
3. **Planes de pago en la app** — depende de que el backend de cobros exista
4. **GPS de membresía familiar** — funcional, testeado y **con demo**

---

## Bloque 1 — Cerrar el hueco de datos de usuarios (🔴, ~0.5 día) — **primero**

### El problema

`backend/app/features/sos_contacts/router.py:55-62`:

```python
@router.post("/api/v1/sos-contacts/reciprocate/{owner_user_id}", ...)
async def reciprocate_contact(owner_user_id: int, ..., user=Depends(get_current_user)):
    user_id = await _get_user_id(db, user)
    return await add_reciprocal_contact(db, user_id, owner_user_id)
```

La auth es **cualquier token Firebase válido**, y `owner_user_id` es un entero **que elige quien llama**. `service.py:106-147` hace **solo dos** checks, y ninguno es de relación:

```python
if current_user_id == owner_user_id:   # que no seas tú mismo
if exists.mappings().first():          # que no sea duplicado (409)
...
owner = await db.execute(text("SELECT display_name, phone FROM users WHERE id = :id"), ...)
...
INSERT INTO sos_contacts (user_id, name, phone, link_status, linked_user_id)
VALUES (:user_id, :name, :phone, 'linked', :linked_user_id)
```

**Tres consecuencias:**

1. **Cosecha de PII a escala.** `users.id` es `BIGSERIAL` → enumerable. La respuesta 201 se arma con `display_name` y `phone` del dueño. Recorres `owner_user_id` de 1 a N y **te llevas nombre real y teléfono de toda la base**. El split 409-vs-404 es además un oráculo limpio de existencia.
2. **Inserción no invitada** en la lista del otro como `link_status='linked'`, con push incluido: *"{adder_name} te agregó como contacto SOS."*
3. **Los SOS del atacante ahora llegan a esa persona.** Y el rate limit de 3-por-10-min del SOS **no aplica aquí** — reciprocate no tiene ninguno.

### ⚠️ El check ya existe — solo está del lado equivocado

`get_who_has_me` (`service.py:85-103`) **sí** exige la relación:

```sql
WHERE sc.linked_user_id = :user_id AND sc.link_status = 'linked'
```

Ese endpoint es claramente el "quién me tiene", y `reciprocate` es su acción de aceptar. La verificación se quedó solo en el camino de lectura.

### Qué hacer

Antes del INSERT, exigir que quien llama aparezca en la lista del dueño:

```python
rel = await db.execute(text("""
    SELECT 1 FROM sos_contacts
    WHERE user_id = :owner_id AND linked_user_id = :caller_id AND link_status = 'linked'
"""), {"owner_id": owner_user_id, "caller_id": current_user_id})
if rel.first() is None:
    raise HTTPException(status_code=403, detail="No existe una relación previa con ese usuario")
```

### DoD del bloque

- [ ] C reciprocando contra A **sin relación previa** → **403**, sin fila creada, sin push
- [ ] El flujo legítimo (A tiene a C vinculado, C reciproca) sigue funcionando
- [ ] Test de integración de **ambos** casos
- [ ] El 403 **no** revela si el `owner_user_id` existe o no

---

## Bloque 2 — Cobros en el sitio web (🔴) — el grueso

### ⚠️ Antes de diseñar nada: la especificación ya existe

**`docs/specs_july05/edgar_sprint_3.md` tiene el diseño completo** — tablas, endpoints, matriz de auth, flujo de Stripe, cómo se conecta el pago con la cuenta. **La especificación existe; el código no.** Úsala como plan, **no la rediseñes**. Te ahorra un día entero de decisiones ya tomadas.

Lo esencial de ahí, para que no tengas que ir a buscarlo:

**Dos tablas** en `ensure_core_tables()` de `main.py` (**no hay Alembic**, se agregan con `CREATE TABLE IF NOT EXISTS`):
- `subscriptions` — `user_id UNIQUE`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `interval`, `current_period_end`
- `stripe_events` — `id` (el `evt_...` de Stripe) como PK, para idempotencia

**La matriz de auth — es donde se equivoca todo el mundo:**

| Endpoint | Auth | Por qué |
|---|---|---|
| `POST /api/v1/subscription/checkout` | Firebase | el usuario pide su sesión de pago |
| `GET /api/v1/subscription/me` | Firebase | la app lee su propio plan |
| `POST /api/v1/subscription/portal` | Firebase | gestionar/cancelar |
| `POST /api/v1/subscription/webhook` | **firma de Stripe** | server-to-server; la firma **es** la auth |
| `POST /api/v1/subscription/grant` | **api_key_auth** | grant manual interno (Edu/Guard) |

> **El webhook NO va detrás de Firebase ni de api_key_auth.** Tiene que ser una ruta pública que Stripe pueda alcanzar; su seguridad es `stripe.Webhook.construct_event` con `STRIPE_WEBHOOK_SECRET`.

**Los dos puntos donde se pelea** (según el spec original): Firebase Auth en la web apuntando **al mismo proyecto** que la app (si el UID no coincide, el pago no mapea a la cuenta), y la verificación de firma del webhook (pruébala con `stripe listen`).

**Idempotencia:** `INSERT INTO stripe_events ... ON CONFLICT (id) DO NOTHING`. Si no insertó, return 200 no-op. **Stripe reenvía el mismo evento** — sin esto, doble-procesas.

### Valida el SDK con Context7 antes de escribir

Las firmas de `checkout.Session.create` y `Webhook.construct_event` cambian entre versiones del paquete `stripe`. **No lo escribas de memoria.**

---

## Bloque 3 — Planes de pago en la app (🔴)

Que la app lea qué plan tiene el usuario y desbloquee según eso.

- **Hook de entitlement:** `useEntitlement()` sobre `GET /subscription/me`, vía `authFetch` (`frontend/utils/api.ts`)
- **Refetch cuando la app vuelve a foreground** — el pago ocurre en la web, la app no recibe callback. Polling on-foreground + un botón "ya pagué" es suficiente.

### ⚠️ Dos decisiones del Sprint 3 que NO se re-discuten

1. **iOS no lleva UI de compra.** Feature bloqueada en iPhone = estado locked **sin botón, sin precio, sin link a la web**. Silencio total (modelo Spotify — evita rechazo por Guideline 3.1.1). **Android sí** puede abrir el navegador.
2. **El backend FastAPI es la única fuente de verdad del plan.** iOS, Android y web leen el mismo `plan`.

### Nota de coordinación con Diego

Diego va a poner un **límite de uso en el asistente de IA** esta semana. Si el límite va a ser **cuota por plan**, necesita que esto exista primero. **Si ves que los planes no van a aterrizar a tiempo, dile el lunes** — así él hace un tope plano y no se queda esperando.

---

## Bloque 4 — GPS de membresía familiar (🔴) — funcional, testeado y **con demo**

Hoy no funciona. **La meta no es "que exista": es que se pueda demostrar funcionando** el viernes.

### ⚠️ Hay un problema de raíz que te va a pegar aquí

**Membresía familiar significa teléfonos compartidos**, y hoy la app **guarda todo sin separar por cuenta**. Todas estas llaves son constantes globales, sin espacio por usuario:

| Archivo | Llave |
|---|---|
| `frontend/app/map/sosQueue.ts:6` | `'@BluEye:sos_queue'` |
| `frontend/utils/pushNotifications.ts:91` | `'push_last_registered_token'` |
| `frontend/utils/locationSync.ts:5-6` | `'@BluEye:location_last_sync'`, `'@BluEye:location_last_coords'` |

Y `frontend/features/auth/AuthContext.tsx:172-185` — `signOut()` llama `GoogleSignin.signOut()` + `firebaseSignOut()` **y nada más**. No limpia AsyncStorage, no desregistra el push token.

**El caso concreto:** A deja un SOS encolado sin internet → cierra sesión → B entra en el mismo teléfono → vuelve la señal → **se manda el SOS de A bajo la sesión y la ubicación de B**.

### Qué hacer

**La mitad barata primero** (🟠 en `sprint.md`): en `signOut()`, limpiar el almacenamiento de la cuenta y desregistrar el push token. Cierra la mayor parte del problema y es rápido.

**La mitad grande** (namespace por UID en cada llave + validar dueño antes de vaciar la cola) es más trabajo. Si no alcanza, que quede escrito.

---

## Estrategia de PRs (≤ 400 líneas cada uno)

1. **Check de relación en reciprocate + tests** — bloque 1, primero de la semana
2. **Backend de suscripciones base** — tablas en `ensure_core_tables()`, `GET /me`, setup del SDK
3. **Backend checkout** — crear customer + session con `client_reference_id`
4. **Backend webhook** — firma, idempotencia, los 3 eventos
5. **Web** — login Firebase + botón → checkout → redirect + success/cancel
6. **App gating** — `useEntitlement` + bloqueo premium + **iOS silencioso**
7. **`signOut` limpia almacenamiento y desregistra push**
8. **GPS familiar** — según lo que pida

---

## DoD

- [ ] Reciprocate sin relación previa → **403**, con test
- [ ] Tablas `subscriptions` + `stripe_events` se crean al arrancar el backend
- [ ] `POST /checkout` crea sesión con `client_reference_id = user_id`
- [ ] Webhook **verifica firma** (firma inválida → 400) y es **idempotente** (mismo `event.id` dos veces no duplica estado), con test
- [ ] `GET /me` refleja el plan
- [ ] Web: login Firebase (**mismo proyecto** que la app) → pago Stripe en modo test → plan marcado
- [ ] App desbloquea premium leyendo `/me`; **iOS sin UI de compra**
- [ ] `signOut()` limpia almacenamiento de cuenta y desregistra el push token
- [ ] **GPS familiar demostrable** en teléfonos reales
- [ ] Demoable en device físico; PRs ≤ 400 líneas

---

## Out of Scope (este sprint)

- **Namespace por UID** en todas las llaves de almacenamiento (la mitad grande del bloque 4)
- **Bluetooth** — pasó a Edgar, ver `edgar_sprint_4.md`
- **Metering de cuota de IA por plan** — vive del lado de Diego, y solo si los planes aterrizan
- **Planes Familiar/Familiar Pro completos** (grupo + bolsa compartida) si no se define la forma — ver `docs/specs_july05/sprint.md`, "Gate de semana 1"
- **Proration, upgrades/downgrades, Stripe Tax, multi-moneda**

---

## Capacidad — mira la math antes de empezar

5 días hábiles para **cuatro cosas críticas**, tres de las cuales están en cero.

| Bloque | Costo estimado |
|---|---|
| 1 · Hueco de datos | ~0.5 día |
| 2 · Cobros web (backend + web) | ~2-2.5 días |
| 3 · Planes en la app | ~1 día |
| 4 · GPS familiar + limpieza de signOut | ~1 día |

**Está apretado y lo sabemos.** El orden de corte ya está decidido en frío en `sprint.md`: **cobros web → planes en la app → GPS familiar**. El hueco de datos se cierra igual pase lo que pase — es medio día y es lo más grave que tenemos abierto.

Si algo te pelea más de un día, **dilo en el grupo el mismo día**. No lo absorbas en silencio.
