# Sprint 2 — Val

**24 may → 5 jun 2026**

Spec técnico detallado de tus dos features para el sprint. Para coordinación general (timeline, checkpoints, cut criteria) → `sprint.md`.

---

## Closeout del sprint 1 (23 may — no cuenta para este sprint)

Antes de empezar el sprint nuevo, cerrar:

- [ ] Corregir y mergear PR de P2 (Waze-style voting). Reference: `specs_may20/val.md` líneas 194-263.
- [ ] Agregar tests de integración para `map_events` (DoD original que nunca se entregó — `specs_may20/val.md` línea 181):
  - Happy path: POST → GET devuelve el evento creado
  - Owner check: PATCH y DELETE retornan 403 si no es el dueño
  - Distance filter: GET con lat/lon filtra correctamente

Si no mergea hoy, no entra al sprint nuevo.

---

## Feature 1 — Bluetooth 1-to-1 text exchange (P0)

### Goal

Mensajería directa entre 2 teléfonos vía BLE. Funciona sin internet. Sin mesh, sin backend, sin sync entre devices. **El producto:** si las redes caen durante un huracán, dos personas cerca pueden seguir comunicándose.

### Context

Hoy no existe nada de Bluetooth en el código. Este feature se construye desde cero, frontend-only. No requiere backend (la identidad sale del nickname broadcasted por BLE, no de un servidor).

**Archivos frontend clave para entry point:**
- `frontend/app/ai/_hooks/useChat.ts` — chat AI actual
- Pantalla anfitriona donde vive el chat AI (probablemente `frontend/app/ai/` route)

Necesitas agregar un toggle en esa pantalla para alternar entre AI chat y BT chat.

### Macro técnico

- **Librería:** `react-native-ble-plx` (default — confirmar con Diego antes de instalar)
- **Permisos Android 12+:** `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, location runtime
- **Permisos iOS:** `NSBluetoothAlwaysUsageDescription` en `Info.plist`
- **Transport:** GATT characteristic read/write
- **Identidad:** nickname broadcasted vía BLE advertisement (no QR, no backend handshake)
- **Persistencia:** MMKV, local-only por device

### Entry point — Toggle en pantalla de Chat AI

Toggle de 2 posiciones en la parte superior de la pantalla actual de chat:
- **Posición 1:** chat con IA (pantalla actual, `useChat.ts`)
- **Posición 2:** interfaz de chat por Bluetooth (lobby + conversaciones)

Una sola pantalla anfitriona, dos modos. Persistir la posición del toggle en MMKV (que el usuario regrese al último modo que usó).

### UX — 3 sub-pantallas del modo Bluetooth

#### 1. Lobby BT

- Encabezado: tu nickname (editable inline)
- Dos toggles independientes:
  - **"Soy visible"** → BLE advertising on/off (default OFF)
  - **"Buscar gente"** → BLE scanning on/off (default OFF)
- Lista de dispositivos descubiertos: nickname + indicador de señal + última vez visto
- Sección debajo: "Conversaciones previas" — chats persistidos aunque el otro ya no esté en rango
- Tap en cualquier persona → abre pantalla de chat con esa persona

#### 2. Chat per-persona

- Burbujas estándar (tuyas a la derecha, del otro a la izquierda)
- Header: nickname del otro + indicador de conexión ("en rango" / "fuera de rango")
- Input de texto + botón enviar
- Estado por mensaje: `enviando` / `enviado` / `falló` / `esperando conexión`
- Menú al presionar burbuja u opciones: "Bloquear" + "Eliminar conversación"

#### 3. Editor de nickname (modal, no full screen)

- Primera vez al activar BT → forzado, no se puede saltar
- Después editable desde el lobby
- Validación: 2-20 caracteres, sin espacios al inicio/final

### Comportamiento

- **Primer contacto:** cuando un nickname nuevo te manda mensaje, banner inline *"Nuevo mensaje de [Nickname]"* con el mensaje visible. Tap → abre el chat. Swipe → descarta. **Sin modal de "aceptar conexión".**
- **Mensajes salientes con peer fuera de rango:** se quedan en cola local con estado "esperando conexión". Cuando el peer reaparece (BLE detection), reintenta automáticamente.
- **Mensajes entrantes:** abiertos por default. El usuario puede bloquear un nickname desde la pantalla de chat (lista de bloqueados en MMKV).
- **Persistencia:** historial en MMKV, local-only. Reinstalar la app = pierdes historial. Acceptable tradeoff para emergencias.

### Límites técnicos

- Mensajes máx **200 caracteres** (constraint de MTU de BLE + emergencias requieren texto corto)
- Colisión de nicknames: si dos "Diego" en rango, mostrar "Diego (a3f2)" usando los últimos 4 chars del BLE address como disambiguador
- Battery: BLE scan continuo en background NO permitido. Solo cuando la pantalla del modo BT está abierta o el toggle "Buscar gente" está ON.

### Storage shape (MMKV)

Recomendado para que sea consistente:

```
bt:nickname               → string
bt:blocked_nicknames      → string[]
bt:conversations          → { [peerId: string]: BtConversation }
```

Donde `BtConversation`:
```ts
{
  peerId: string         // BLE address o nickname disambiguado
  peerNickname: string
  lastSeen: timestamp
  messages: BtMessage[]
}
```

Y `BtMessage`:
```ts
{
  id: uuid
  direction: 'sent' | 'received'
  text: string
  timestamp: number
  status: 'sending' | 'sent' | 'failed' | 'queued'
}
```

### Estrategia de PRs (≤ 400 líneas cada uno)

Recomendado dividir en 3 PRs:
1. **BT scaffold + lobby** — librería, permisos, toggles, scan list, nickname editor
2. **BT chat per-persona** — pantalla de chat, send/receive sobre GATT, status por mensaje
3. **BT edge cases + persistencia** — cola offline, bloqueo, primer contacto banner, MMKV persistence

### DoD

- [ ] Demoable con 2 teléfonos físicos intercambiando texto sin internet
- [ ] Toggles "Soy visible" y "Buscar gente" funcionan independientes
- [ ] Mensajes salientes con peer fuera de rango quedan en cola y se entregan al reconectar
- [ ] Bloquear nickname funciona (mensajes del bloqueado no aparecen)
- [ ] Historial persiste entre cierres de app
- [ ] Editor de nickname forzado en primer uso
- [ ] Banner de primer contacto en lugar de modal bloqueante
- [ ] Permisos Android e iOS funcionan correctamente
- [ ] PR(s) ≤ 400 líneas cada uno
- [ ] Reviewed por Diego

### Out of Scope (Sprint 3+)

- BT mesh / multi-hop routing
- Persistencia en backend / sync entre devices
- Cifrado end-to-end (mensajes signed, key exchange)
- Group chats
- Compartir ubicación o archivos vía BT

---

## Feature 2 — Map events offline write queue + MapMarker OOM fix (P0)

### Goal

Cerrar los huecos del feature de mapa de Sprint 1:
1. Cola para creates de eventos que fallan offline.
2. Fix del crash sostenido de MapMarker.

### Context

`frontend/app/map/service.ts` ya tiene `loadCachedZones` (lee desde AsyncStorage) y `loadZones` que cae al cache si el GET HTTP falla. Lo que **no** tiene es manejo del caso write-fail: si `createZone` falla por falta de conexión, el evento se pierde.

### Offline write queue

- Cola en MMKV (NO AsyncStorage — consistente con la decisión de stack en RoadMap)
- Cuando `createZone` falla por network error (no 4xx server errors), agregar el payload a la cola
- Cuando vuelve la conexión, drenar la cola (NetInfo listener en `_layout.tsx` o donde corresponda)
- Indicador visual inline en el mapa cuando hay eventos en cola sin sincronizar

**Archivos a tocar:**
- `frontend/app/map/service.ts` — agregar `enqueueZoneCreate`, `drainCreateQueue`
- `frontend/app/map/index.tsx` — wiring de NetInfo y indicador visual

### MapMarker OOM fix

- Crash sostenido en mapa por re-rendering de bitmaps custom de markers (gap conocido del RoadMap)
- Fix: agregar `tracksViewChanges={false}` a los componentes `<Marker>` en `frontend/app/map/index.tsx`
- ~5 minutos de trabajo (1 prop), pero non-negotiable porque ya está documentado como crash conocido

### DoD

- [ ] Crear evento sin internet → se queda en cola → al reconectar se sube y aparece como normal
- [ ] Indicador visual cuando hay eventos en cola
- [ ] No se duplican eventos al drenar la cola (idempotencia — usar UUIDs client-side o dedup en backend)
- [ ] MapMarker fix aplicado y verificado: 5+ minutos de uso del mapa con muchos markers ya no crashea en device de gama media
- [ ] Reviewed por Diego

---

## Out of Scope general

- BT mesh, BT backend persistence (Sprint 3+)
- Expiración automática de eventos de mapa (v1.1)
- Editar tipo del evento de mapa (solo description por ahora)

---

## Capacidad — mira la math antes de empezar

Tienes ~10 días hábiles × 3-4h = 30-40h disponibles.
- Bluetooth: ~30-40h (heavy feature, frontend nuevo desde cero)
- Map offline queue + MapMarker: ~6-10h
- Total: 36-50h en un budget de 30-40h

**Estás en el límite o ligeramente sobre.** Si el día 3 ves que BT se está peleando con permisos o la librería, **flag visible en el grupo** (principio de accountability del sprint). No absorbas en silencio.
