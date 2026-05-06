# Notificaciones + IA — Edgar

## Resumen de tareas

### P1 — Must-Have (bloqueantes para v1.0)

| # | Feature | Mini-deadline | Standard |
|---|---|---|---|
| 1 | Endpoint "usuarios en zona afectada" | Hoy May 5 | Backend funcionando con mock data |
| 2 | Primer push recibido en device real | May 7 | Push en dispositivo físico |
| 3 | SMN alerts → notificaciones automáticas geocercadas + AlarmScreen | May 10 | E2E + Push real + Modal en foreground |
| 4 | Preferencias de notificaciones (on/off por tipo) | May 12 | E2E + Test + Device |
| 5 | AI alert summary — LLM genera resumen para el usuario | May 13 | E2E + Test + Device |

### P2 — Extensión (solo si P1 completo)

| # | Feature |
|---|---|
| 6 | Preferencias avanzadas: por categoría, no molestar, opt-in granular |

---

## Contexto del sistema actual

**Ya construido y funcionando:**
- `device_tokens` table — tokens Expo asociados a `user_id`
- `get_tokens_for_users(user_ids)` — dado una lista de IDs, devuelve sus tokens
- SIAT background loop — cada 30 min evalúa usuarios con haversine, manda push solo a afectados
- `evaluate_user(lat, lon, cyclone)` — retorna `siat_level`, `distance_km`, `eta_hours`, `reason`
- `_push_per_user()` — envío targeted por usuario, no broadcast
- Escalation logic — solo notifica cuando el nivel sube

**Lo que falta:**
- SMN/CONAGUA alerts no disparan notificaciones — se guardan en DB pero nadie las manda
- No existe tabla de preferencias — todos reciben todo
- No existe resumen por IA
- No existe pantalla de preferencias de notificaciones en frontend

**El SIAT loop (ciclones NHC) ya es automático. Lo que Edgar construye es la capa faltante.**

---

## Feature 1 — Endpoint "usuarios en zona afectada"

**Due: Hoy May 5**

### Goal
Exponer como HTTP endpoint la lógica que el SIAT loop ya hace internamente: dado un punto geográfico y un radio, retornar qué usuarios están dentro.

### API

**GET /api/v1/siat/affected-users**

Auth: API key (`X-Api-Key` header) — endpoint interno, no público.

Query params:
- `lat` (requerido)
- `lon` (requerido)
- `radius_km` (opcional, default: 500)

Response 200:
```json
{
  "total": 3,
  "users": [
    { "user_id": 1, "distance_km": 120.5 },
    { "user_id": 4, "distance_km": 340.2 },
    { "user_id": 7, "distance_km": 498.1 }
  ]
}
```

### Implementación
Reusar `_get_users_with_location()` y `haversine_km()` que ya existen en `siat/service.py` y `siat/evaluator.py`. No reinventar.

### Test mínimo
Request con lat/lon del centro de México → responde lista de usuarios dentro del radio.

---

## Feature 2 — Primer push en device real

**Due: May 7**

No es código nuevo — es verificación de lo que ya existe.

**Pasos:**
1. Registrar token de tu dispositivo físico llamando `POST /api/v1/push-token`
2. Registrar tu ubicación con `PATCH /api/v1/users/me/location`
3. Triggear manualmente el SIAT loop: `POST /api/v1/siat/run` (ya existe)
4. Si hay ciclón activo → push debería llegar. Si no hay ciclón → usar `POST /api/v1/notifications/send-all` para probar que la cadena funciona

**Deliverable:** screenshot o video de push recibido en device físico.

---

## Feature 3 — SMN alerts → notificaciones automáticas

**Due: May 10**

### Goal
Cuando el SIAT loop detecta una nueva alerta de SMN/CONAGUA y la guarda en la tabla `alerts`, disparar automáticamente notificaciones a los usuarios dentro del radio de impacto.

### Cómo funciona actualmente
El SIAT loop en `siat/service.py` → `run_cycle()`:
1. Fetch ciclones NHC
2. Evalúa usuarios con haversine → SIAT level
3. Si level subió → push al usuario

Los alerts de SMN se guardan en la tabla `alerts` pero nadie los lee para mandar push.

### Qué construye Edgar

Extender `run_cycle()` para que también:
1. Lea alerts nuevos de la tabla `alerts` con lat/lon
2. Use `haversine_km()` para encontrar usuarios dentro de un radio (usar 500km como default para alerts gubernamentales)
3. Mande push usando `_push_per_user()` (ya existe) o equivalente

**Regla:** solo mandar push si el alert fue creado en los últimos 35 minutos (evitar re-notificar en cada ciclo).

### DB
No se necesita tabla nueva. Agregar columna a `alerts`:
```sql
ALTER TABLE alerts ADD COLUMN notified_at TIMESTAMPTZ;
```
Se marca cuando el push fue enviado. Si `notified_at IS NOT NULL` → ya se notificó, skip.

### Push payload para SMN alerts
```json
{
  "title": "Nueva alerta — {alert.title}",
  "body": "{alert.short}",
  "data": {
    "alert_id": "uuid",
    "level": "3"
  }
}
```

### Push priority
Todos los pushes de alerta deben enviarse con prioridad alta. En el payload de Firebase:
```python
messaging.AndroidConfig(priority="high")
messaging.APNSConfig(headers={"apns-priority": "10"})
```
Esto garantiza entrega inmediata en background y fully closed, con sonido y pantalla activa.

### Frontend — AlarmScreen (app en foreground)
Cuando la app está abierta y llega un push de alerta con `siat_level >= 3` (Amarillo+), mostrar el `AlarmScreen` modal automáticamente.

El archivo `frontend/app/AlarmScreen.jsx` ya existe con la UI completa. Solo necesita ser conectado a notificaciones reales:

1. En el layout raíz, agregar un listener de `expo-notifications`:
```js
Notifications.addNotificationReceivedListener(notification => {
  const level = notification.request.content.data?.siat_level
  if (Number(level) >= 3) {
    // mostrar AlarmScreen con datos reales del push
  }
})
```
2. Reemplazar `MOCK_ALERTS` en `AlarmScreen.jsx` con los datos que llegan del push (`title`, `message`, `alert_id`, `level`).
3. El botón "Más información" debe navegar a `/alerts/{alert_id}`.

**Background/closed:** el OS maneja la notificación automáticamente como heads-up banner con sonido. No se necesita código adicional para ese caso.

### Test mínimo
Insertar manualmente un alert con lat/lon cerca de un usuario de prueba → verificar que el SIAT cycle siguiente manda push a ese usuario y no a otro fuera del radio. Con app abierta → AlarmScreen aparece. Con app cerrada → heads-up banner con sonido.

---

## Feature 4 — Preferencias de notificaciones

**Due: May 12**

### Goal
Permitir que cada usuario controle qué notificaciones recibe. El sistema respeta sus preferencias antes de mandar cualquier push.

### DB Schema

Tabla nueva: `notification_preferences`

```sql
CREATE TABLE notification_preferences (
    user_id            BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    siat_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
    min_siat_level     INT     NOT NULL DEFAULT 2,
    map_events_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

`min_siat_level`: nivel mínimo para recibir push SIAT. 2 = Verde en adelante, 3 = Amarillo en adelante, etc.

Agregar en `ensure_core_tables()` en `main.py`, mismo patrón que otras tablas.

### API Contract

**GET /api/v1/notification-preferences**

Auth: Firebase token.

Response 200:
```json
{
  "siat_enabled": true,
  "min_siat_level": 2,
  "map_events_enabled": true
}
```

Si el usuario no tiene registro → devolver defaults (no 404).

---

**PATCH /api/v1/notification-preferences**

Auth: Firebase token.

Request body (todos opcionales):
```json
{
  "siat_enabled": false,
  "min_siat_level": 3,
  "map_events_enabled": true
}
```

Response 200: preferencias actualizadas.

---

### Integración en SIAT loop

Antes de agregar un usuario a `escalations` en `run_cycle()`, chequear sus preferencias:

```python
# pseudocódigo — no copiar literal
prefs = await get_user_preferences(db, user_id)
if not prefs.siat_enabled:
    continue
if new_level < prefs.min_siat_level:
    continue
# → agregar a escalations
```

### Frontend — Pantalla de preferencias

**Flujo:** Settings → tap "Notificaciones" → pantalla dedicada

Pantalla muestra:
- Toggle "Alertas SIAT" (on/off) → `siat_enabled`
- Selector de nivel mínimo: Verde / Amarillo / Naranja / Rojo → `min_siat_level`
- Toggle "Eventos del mapa" (on/off) → `map_events_enabled`

Al cambiar cualquier toggle → llamar `PATCH /api/v1/notification-preferences` inmediatamente.
Al cargar la pantalla → llamar `GET /api/v1/notification-preferences`.

### Test mínimo
Usuario con `siat_enabled: false` no recibe push cuando SIAT cicla. Usuario con `min_siat_level: 3` no recibe push en nivel 2 (Verde).

---

## Feature 5 — AI alert summary

**Due: May 13**

### Goal
Dado una alerta (ciclón o SMN), el LLM genera un resumen en lenguaje natural que el usuario ve en la pantalla de detalle del alert. No en el push — on-demand al abrir el alert.

### Por qué endpoint separado
El modelo para summarización puede ser diferente al resto de los usos de IA. Separarlo permite swapear modelos sin tocar nada más.

### API

**POST /api/v1/ai/alert-summary**

Auth: Firebase token.

Request body:
```json
{
  "alert_id": "uuid"
}
```

El backend busca el alert por ID, construye el prompt con sus datos, llama al LLM, devuelve el resumen.

Response 200:
```json
{
  "alert_id": "uuid",
  "summary": "El ciclón Aletta se encuentra a 320 km de tu ubicación con vientos de 150 km/h. Según la trayectoria actual, podría acercarse en las próximas 18 horas. Se recomienda preparar kit de emergencia y estar pendiente de indicaciones oficiales."
}
```

Errores:
- `404` — alert no existe
- `503` — LLM no disponible (devolver error, no inventar resumen)

### Prompt base

```
Eres un asistente de alertas de emergencia. Dado los siguientes datos de un ciclón tropical, 
genera un resumen claro, directo y útil para el usuario afectado. 
Máximo 3 oraciones. Lenguaje simple. No uses jerga técnica.

Datos: {alert data en JSON}
```

### Frontend

Archivo: `frontend/app/alerts/[id].tsx` — pantalla de detalle ya construida.

Agregar entre el `alert.short` (línea ~163) y la sección RECOMENDACIONES:
- Al montar la pantalla → llamar `POST /api/v1/ai/alert-summary` con el `alert_id`
- Mientras carga → mostrar skeleton/spinner con el mismo estilo `glassCard`
- Al recibir → mostrar tarjeta "Resumen IA" con el texto generado
- Si falla → ocultar la sección silenciosamente (no mostrar error al usuario)

### Test mínimo
`POST /api/v1/ai/alert-summary` con un alert_id válido → responde con texto coherente en español.

---

## Definition of Done (P1 completo)

- [ ] GET `/api/v1/siat/affected-users` retorna usuarios dentro del radio
- [ ] Push recibido en device físico de Edgar
- [ ] SMN alert nuevo dispara push automático a usuarios afectados en siguiente ciclo
- [ ] `notified_at` se marca correctamente (no re-notifica en ciclos siguientes)
- [ ] `notification_preferences` tabla creada automáticamente al iniciar backend
- [ ] GET/PATCH preferencias funciona y persiste en DB
- [ ] SIAT loop respeta `siat_enabled` y `min_siat_level`
- [ ] Pantalla de preferencias en frontend con toggles funcionales
- [ ] `POST /api/v1/ai/alert-summary` retorna resumen en español
- [ ] Resumen visible en pantalla de detalle del alert
- [ ] Al menos un test de integración por cada endpoint nuevo
- [ ] Todo demoable en device físico

---

## Out of Scope

- Notificaciones para eventos del mapa de Val (depende de que Val entregue su feature primero)
- Push incluido en la notificación del sistema operativo con resumen IA (eso requiere pre-generar el summary antes de mandar el push — v1.1)
- Historial de notificaciones recibidas (v1.1)

---

## Extensión P2 — Preferencias avanzadas

**GATE: No empezar hasta que P1 esté completo y demoable en device.**

Agregar a `notification_preferences`:
```sql
ALTER TABLE notification_preferences
  ADD COLUMN quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN quiet_start         TIME,
  ADD COLUMN quiet_end           TIME;
```

API: extender PATCH para aceptar los nuevos campos.

SIAT loop: si el push cae en quiet hours del usuario → skip (excepto nivel 5 ROJO — emergencia siempre pasa).

Frontend: agregar sección "No molestar" en la pantalla de preferencias con selector de horario.
