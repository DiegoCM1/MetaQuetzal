# Sprint 2 — Edgar

**24 may → 5 jun 2026**

Spec técnico detallado de tus dos features para el sprint. Para coordinación general (timeline, checkpoints, cut criteria) → `sprint.md`.

---

## Closeout del sprint 1 (23 may — no cuenta para este sprint)

- [ ] Terminar tweaks locales + mergear PR de quiet hours.

Si no mergea hoy, no entra al sprint nuevo.

---

## Feature 1 — SOS full in-app (P0)

### Goal

Botón SOS en la app que dispara push geolocalizado a la red de apoyo del usuario. Cuando alguien se mete en una emergencia, su gente recibe la alerta con la ubicación.

### Context

**Lo que ya existe (tu trabajo previo):**
- `backend/app/features/future_integration/sos/` con `router.py`, `service.py`, `schemas.py`
- Endpoints definidos: `POST /api/v1/sos`, `GET /api/v1/sos/me`, `GET /api/v1/sos`, `GET /api/v1/sos/{id}`, `PATCH /api/v1/sos/{id}/resolve`
- DB layer: create, list, resolve, list_by_user

**Lo que está bloqueando que se wire:**
- El código usa `password_hash` y un `get_current_user` basado en auth con password
- BluEye usa Firebase Auth — todos los demás features ya usan `app.core.firebase` para verificar tokens
- El README del feature (en `future_integration/sos/README.md`) explica el bloqueo

**Lo que falta:** rewire a Firebase, agregar red de apoyo, wire en `main.py`, frontend.

### Backend — pasos en orden

#### 1. Rewire de auth a Firebase

- Eliminar referencias a `password_hash` en `service.py` y `schemas.py`
- Reemplazar `get_current_user` con el dependency Firebase que ya usan otros features (revisar cómo lo hace `notification_preferences/router.py` o `map_events/router.py`)
- Ajustar tipo de `user_id` para que case con `users.id` de BluEye (BIGINT)
- Mover el folder de `future_integration/sos/` → `features/sos/` (o discutir con Diego)

#### 2. Red de apoyo — tabla nueva

```sql
CREATE TABLE support_network (
    id            SERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label         VARCHAR(50),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contact_id)
)
```

Agregar en `ensure_core_tables()` en `main.py`, mismo patrón que las otras tablas.

#### 3. Endpoints de red de apoyo

**GET /api/v1/sos/network**
- Auth: Firebase token
- Response: lista de contactos del usuario actual (con info básica: id, displayName, push token registrado sí/no)

**POST /api/v1/sos/network**
- Body: `{ "contact_id": int, "label": string? }`
- Errores: `404` si contact_id no existe, `409` si ya está en la red
- Response 201: contacto agregado

**DELETE /api/v1/sos/network/{contact_id}**
- Response 204

#### 4. Trigger SOS dispara push a la red

Modificar el handler de `POST /api/v1/sos` para que después de crear el evento:
- Lookup de la red de apoyo del usuario que triggerea
- Para cada contacto, obtener push tokens vía `get_tokens_for_users()` (ya existe)
- Llamar `_push_per_user` (existe en `siat/service.py`) con payload de SOS:

```python
{
  "title": "🆘 [Nickname] necesita ayuda",
  "body": f"Ubicación: {lat:.4f}, {lon:.4f}",
  "data": {
    "type": "sos",
    "sos_id": "<uuid>",
    "lat": 19.43,
    "lon": -99.13,
    "from_user_id": 47
  }
}
```

- Priority alta (mismo patrón que SIAT pushes):
  - Android: `messaging.AndroidConfig(priority="high")`
  - iOS: `messaging.APNSConfig(headers={"apns-priority": "10"})`

#### 5. Wire del router en main.py

```python
from app.features.sos.router import router as sos_router
# ...
app.include_router(sos_router)
```

### Frontend

#### 1. Botón SOS

Ubicación: pantalla principal o tab dedicado. **Hablarlo con Diego antes de decidir** (decision UX, no técnica).

UX:
- Botón rojo visible
- Tap → modal de confirmación *"¿Activar SOS? Tu red de apoyo recibirá tu ubicación."*
- Confirmar → POST a `/api/v1/sos` con lat/lon actuales
- Después del trigger → mostrar pantalla "SOS activo" con timestamp + opción de cancelar/resolver

#### 2. Pantalla de gestión de red de apoyo

Ubicación: Settings → "Red de apoyo"

UX:
- Lista de contactos actuales con info básica (nombre, indicador si tiene push token)
- Botón "Agregar contacto" → buscar usuarios por email/displayName
  - Esto requiere un endpoint adicional `GET /api/v1/users/search?q=...` — discutir con Diego si lo agregamos o si usamos email exacto match contra `users` table
- Tap en contacto → opción de remover
- Indicador de "sin push token" si el contacto no recibirá la notificación

#### 3. Receiver — UI cuando llega SOS push

Cuando un usuario recibe un push de SOS de su red:
- Modal específico de SOS (puede ser un AlarmScreen modificado o componente nuevo)
- Muestra: nombre del que pidió ayuda, ubicación en mapa, timestamp
- Botones: "Ver en mapa" (centra el mapa en su ubicación) + "Llamar" (deep-link a `tel:`)

### Tests

- Integración: usuario A crea SOS, usuarios B y C de su red reciben push (mock del expo push service)
- Owner check: SOS de A no se puede resolver por B
- Validación: SOS sin lat/lon devuelve 422

### Estrategia de PRs (≤ 400 líneas cada uno)

Recomendado dividir en 4 PRs:
1. **SOS backend rewire** — Firebase auth, mover folder, wire en `main.py`
2. **SOS support_network endpoints** — tabla, CRUD de contactos
3. **SOS push trigger** — modificar POST handler para disparar push a la red
4. **SOS frontend** — botón, modal, pantalla de gestión, UI de receiver

### DoD

- [ ] Tabla `support_network` se crea automáticamente al iniciar el backend
- [ ] Rewire de auth a Firebase completado (sin `password_hash` references)
- [ ] Router wired en `main.py`
- [ ] CRUD de red de apoyo funcional (GET / POST / DELETE)
- [ ] Trigger SOS dispara push a toda la red con prioridad alta
- [ ] Frontend: botón SOS + modal confirmación + pantalla SOS activo
- [ ] Frontend: pantalla de gestión de red de apoyo
- [ ] Frontend: UI de recepción de push de SOS
- [ ] Al menos 1 test de integración happy path
- [ ] Demoable en device físico con 2+ usuarios (A triggerea, B y C reciben)
- [ ] PR(s) ≤ 400 líneas cada uno
- [ ] Reviewed por Diego

---

## Feature 2 — Notification test rig (P0)

### Goal

Eliminar la fricción de testear notificaciones. Hoy nadie del equipo puede verificar push end-to-end sin esperar un huracán real o un evento de mapa real. El rig cambia eso a un click.

**Esto cubre SIAT y SMN también** — eres responsable end-to-end del rig para todos los tipos de notificación del sistema.

### Context

**Lo que ya existe:**
- `expo-notifications` integrado y funcional
- `device_tokens` table con tokens del equipo
- `_push_per_user` en `siat/service.py` que es el envío genérico
- SIAT loop cada 30 min que dispara pushes reales
- Tu trabajo previo de SIAT push y SMN push está en `siat/service.py`

**Lo que falta:**
- Una forma de disparar pushes específicos a un usuario específico sin esperar un trigger natural
- Documentación de cómo testear los 3 modos del OS (foreground / background / app killed) en Android e iOS

### Backend

#### Endpoint: POST /api/v1/notifications/test

Auth: API key interno (no Firebase) — usar el mismo middleware que ya existe para endpoints internos en `middleware/`.

Body:
```json
{
  "user_id": 47,
  "scenario": "siat_level_3" | "siat_level_5" | "smn_alert" | "sos_triggered",
  "override_payload": { /* opcional */ }
}
```

Cada `scenario` mapea a un payload realista:
- `siat_level_3` → "🟡 SIAT Amarillo" con datos mock de ciclón (lat, lon, eta_hours, distance_km)
- `siat_level_5` → "🔴 SIAT Rojo" con datos críticos
- `smn_alert` → "Nueva alerta SMN" con title/short mock
- `sos_triggered` → payload de SOS de un usuario A inexistente

Response 200:
```json
{ "sent": true, "tokens": 2, "scenario": "siat_level_3" }
```

#### Implementación

- Reusar `_push_per_user` y `get_tokens_for_users` que ya existen
- Mapa scenario → payload JSON
- Loggear cada test push para audit (logger.info; tabla `test_pushes` opcional si quieres histórico)

### Frontend — Dev panel en Settings

- Panel hidden visible solo cuando `__DEV__ === true` o un flag de "dev mode" en MMKV
- Lista de scenarios → tap dispara el endpoint con `user_id` del usuario logueado actualmente
- Después del tap, mostrar respuesta del backend (*"Sent: 2 tokens"*)
- Esto le permite a cualquier dev probar push en su propio device sin tocar otra app

**Archivos a tocar:**
- `frontend/app/SettingsScreen.tsx` — agregar el panel
- `frontend/utils/api.ts` (o equivalente) — agregar `triggerTestPush(scenario)`

### Documentación — 1-pager

Archivo: `docs/specs_june05/notification_testing.md`

Cubrir:
- Cómo registrar tu device en una env (dev / staging / prod)
- Cómo activar el panel dev en Settings
- Qué scenarios existen y qué prueba cada uno
- Cómo testear los 3 modos del OS:
  - **Foreground (app abierta):** AlarmScreen debería aparecer si level >= 4
  - **Background (app en background):** banner heads-up, sonido
  - **Killed (app cerrada):** notificación del OS, tap abre la app en la pantalla correcta
- Diferencias de comportamiento Android vs iOS

### Test mínimo

- POST al endpoint con scenario válido → push llega al device del equipo
- POST con scenario inválido → 422

### DoD

- [ ] Endpoint `POST /api/v1/notifications/test` funcional con todos los scenarios (SIAT, SMN, SOS)
- [ ] Dev panel en Settings visible solo en dev builds
- [ ] Doc `docs/specs_june05/notification_testing.md` escrito y verificado por Val y Diego
- [ ] Cualquier dev del equipo dispara y verifica un push end-to-end en su device en <2min
- [ ] Probado en Android e iOS (al menos el iOS de Diego)
- [ ] Reviewed por Diego

---

## Out of Scope (Sprint 3+)

- Histórico de tests / dashboard de notification testing
- Schedule de tests automatizados en CI
- Tests de notification UI (snapshot, etc.)

---

## Capacidad — mira la math antes de empezar

Tienes ~10 días hábiles × 3-4h = 30-40h disponibles.
- SOS (continuación, ya hay trabajo previo): ~20-30h
- Notification test rig: ~10-15h
- Total: 30-45h en un budget de 30-40h

**Tight, pero alcanza si SOS no se complica.** Si el rewire de auth pelea más de lo esperado, **flag visible en el grupo** el día 3. No absorbas en silencio.
