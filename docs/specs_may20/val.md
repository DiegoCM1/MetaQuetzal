# Eventos Compartidos en Mapa — Val

## Goal
Persistir eventos reportados por usuarios en la base de datos y mostrarlos en el mapa a otros usuarios cercanos, reemplazando el almacenamiento local actual.

---

## Context

**Hoy:** El mapa ya tiene UI completa — 4 tipos de evento (natural, vial, peligro, ayuda), modal de reporte, edición, eliminación. Todo funciona pero guarda en almacenamiento local del dispositivo. Nadie más ve los eventos.

**Después de este feature:** Los eventos se guardan en PostgreSQL. Cualquier usuario dentro de 100km ve los mismos eventos en tiempo real. El código local de storage (`loadRedZones`, `saveRedZone`, `updateRedZone`, `deleteRedZone`) se reemplaza con llamadas al API.

**Archivos frontend clave:**
- `frontend/app/map/index.tsx` — pantalla principal, aquí van los cambios de integración
- `frontend/app/map/service.ts` — aquí vive el storage local, se reemplaza con llamadas HTTP

---

## DB Schema

Tabla nueva: `map_events`

```sql
CREATE TABLE map_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('natural', 'vial', 'peligro', 'ayuda')),
    description TEXT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lon         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

Agregar en `backend/app/main.py` dentro de `ensure_core_tables()`, mismo patrón que `alerts` y `device_tokens`.

---

## API Contract

Todos los endpoints requieren Firebase auth header: `Authorization: Bearer <token>`

---

### POST /api/v1/map-events
Crear un nuevo evento.

**Request body:**
```json
{
  "type": "natural",
  "description": "Árbol caído en la carretera",
  "lat": 19.4326,
  "lon": -99.1332
}
```

**Validaciones:**
- `type` debe ser uno de: `natural`, `vial`, `peligro`, `ayuda`
- `description` no puede estar vacío
- `lat` y `lon` deben ser números válidos

**Response 201:**
```json
{
  "id": "uuid",
  "user_id": 1,
  "type": "natural",
  "description": "Árbol caído en la carretera",
  "lat": 19.4326,
  "lon": -99.1332,
  "created_at": "2026-05-05T10:00:00Z",
  "updated_at": "2026-05-05T10:00:00Z"
}
```

**Errores:**
- `401` — token inválido
- `404` — usuario no tiene perfil (debe llamar `POST /api/v1/users/me` primero)
- `422` — validación fallida

---

### GET /api/v1/map-events
Obtener eventos cercanos al usuario.

**Query params:**
- `lat` (requerido) — latitud del usuario
- `lon` (requerido) — longitud del usuario
- `radius_km` (opcional, default: 100) — radio en kilómetros

**Response 200:**
```json
[
  {
    "id": "uuid",
    "user_id": 1,
    "type": "vial",
    "description": "Camino bloqueado",
    "lat": 19.4000,
    "lon": -99.1000,
    "created_at": "2026-05-05T10:00:00Z",
    "updated_at": "2026-05-05T10:00:00Z"
  }
]
```

El backend filtra por distancia haversine. Usar la misma función que ya existe en `siat/evaluator.py`.

---

### PATCH /api/v1/map-events/{id}
Editar descripción de un evento propio.

**Request body:**
```json
{
  "description": "Descripción actualizada"
}
```

**Response 200:** evento actualizado (mismo shape que POST)

**Errores:**
- `403` — el evento no pertenece al usuario autenticado
- `404` — evento no existe

---

### DELETE /api/v1/map-events/{id}
Eliminar un evento propio.

**Response 204:** sin body

**Errores:**
- `403` — el evento no pertenece al usuario autenticado
- `404` — evento no existe

---

## Frontend Integration

Reemplazar el servicio local (`frontend/app/map/service.ts`) con llamadas HTTP al API. El resto de `index.tsx` no debería cambiar — la UI ya está hecha.

| Acción actual | Reemplazar con |
|---|---|
| `loadRedZones()` | `GET /api/v1/map-events?lat=&lon=&radius_km=100` |
| `saveRedZone(zone)` | `POST /api/v1/map-events` |
| `updateRedZone(zone)` | `PATCH /api/v1/map-events/{id}` |
| `deleteRedZone(id)` | `DELETE /api/v1/map-events/{id}` |

**Al cargar el mapa:** usar la ubicación actual del usuario como `lat` y `lon` para el GET.

**Restricción "reportar solo cerca de mí":** antes de abrir el modal de reporte, verificar que la ubicación del tap esté dentro de 100km del usuario. Si no, mostrar Toast de error y no abrir el modal.

**Toggle de eventos en el mapa:** agregar un toggle "Eventos" en el modal de capas existente (`layerModalVisible`). Cuando está OFF, no renderizar los markers. ON por default.

---

## Offline Behavior

- **Ver eventos:** guardar la última respuesta exitosa del GET en MMKV. Si no hay conexión, cargar desde MMKV y mostrar un indicador "Sin conexión — mostrando datos guardados".
- **Crear evento:** el flujo optimista ya existe en `handleSaveZone` (agrega al estado local primero, revierte si falla). Cuando falla por falta de conexión, guardar en una cola en MMKV y reintentar cuando regrese la conexión.
- **Editar / Eliminar:** mismo patrón optimista que ya existe.

---

## Definition of Done

- [ ] Tabla `map_events` se crea automáticamente al iniciar el backend
- [ ] `POST /api/v1/map-events` guarda el evento y lo devuelve con ID
- [ ] `GET /api/v1/map-events` devuelve solo eventos dentro de 100km
- [ ] `PATCH` y `DELETE` funcionan solo para el owner del evento
- [ ] Frontend carga eventos del API al montar el mapa
- [ ] Crear evento en el frontend persiste en DB y aparece en otro dispositivo
- [ ] Toggle "Eventos" en el panel de capas funciona
- [ ] Restricción "solo cerca de mí" bloquea reportes lejanos con feedback visual
- [ ] Eventos visibles sin conexión desde caché MMKV
- [ ] Al menos un test de integración del happy path (POST + GET devuelve el evento)
- [ ] Demoable en device físico con 2 usuarios distintos viendo el mismo evento

---

## Out of Scope

- Expiración automática de eventos (v1.1)
- Notificaciones cuando alguien reporta cerca (responsabilidad de Edgar)
- Editar el tipo del evento (solo descripción por ahora)

---

## Extensión P2 — Verificación Waze-style

**GATE: No empezar esto hasta que P1 esté demoable en device físico con 2 usuarios.**

### Goal
Permitir que usuarios voten si un evento sigue siendo válido. Eventos con demasiados votos negativos se ocultan automáticamente.

### DB Schema adicional

Columnas nuevas en `map_events`:
```sql
ALTER TABLE map_events
  ADD COLUMN upvotes   INT NOT NULL DEFAULT 0,
  ADD COLUMN downvotes INT NOT NULL DEFAULT 0;
```

Tabla nueva para evitar votos duplicados:
```sql
CREATE TABLE map_event_votes (
    id          SERIAL PRIMARY KEY,
    event_id    UUID REFERENCES map_events(id) ON DELETE CASCADE,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    vote        VARCHAR(4) NOT NULL CHECK (vote IN ('up', 'down')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);
```

### API Contract adicional

**POST /api/v1/map-events/{id}/vote**

Auth requerido. Un usuario solo puede votar una vez por evento.

Request body:
```json
{ "vote": "up" }
```

Response 200:
```json
{
  "id": "uuid",
  "upvotes": 5,
  "downvotes": 2
}
```

Errores:
- `409` — usuario ya votó en este evento
- `403` — usuario intentando votar su propio evento

**Regla de ocultamiento:** si `downvotes >= 5` y `downvotes > upvotes * 2`, el evento no aparece en el GET. No se elimina — solo se filtra.

### Frontend adicional

- En el modal de detalle del evento, agregar botones de upvote/downvote
- Mostrar conteo actual de votos
- Deshabilitar botones si el usuario ya votó o es el owner del evento

### Definition of Done P2

- [ ] Un usuario no puede votar su propio evento
- [ ] Un usuario no puede votar dos veces el mismo evento
- [ ] Evento con suficientes downvotes desaparece del mapa de otros usuarios
- [ ] UI de votación visible en modal de detalle
