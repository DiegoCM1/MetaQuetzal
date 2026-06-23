# Sprint 3 — Val

**22 jun → 7 jul 2026**

Spec técnico detallado de tu feature para el sprint: **Bluetooth mesh multi-salto (Android)**. Para coordinación general (timeline, checkpoints, cut criteria, seams) → `sprint.md`. **Lee primero las "Decisiones cross-cutting (seams)" de `sprint.md` — ahí están las decisiones que NO se re-deciden aquí.**

---

## Feature — Bluetooth mesh multi-salto (P0)

### Goal

Evolucionar el chat local **1-a-1** (`frontend/app/local-chat/`) a **mesh multi-salto**: un mensaje brinca de teléfono en teléfono (A → B → C) para alcanzar devices que están **fuera del rango directo** del emisor. Hoy dos teléfonos hablan solo si están en rango uno del otro; al final del sprint, **B en medio retransmite** y A le llega a C sin verse directamente.

**Esto es lo único que prueba mesh:** 3+ teléfonos Android, A y C fuera de rango directo, B en medio → mensaje de A llega a C **vía B**. Si solo demuestras 1-a-1, no es mesh.

### Context

**Lo que ya existe (y está diseñado para esto):**
- `frontend/app/local-chat/` — chat local 1-a-1 sobre **Google Nearby Connections**, ya en producción Android.
- El **`Envelope`** (`_services/protocol.ts`) ya trae `id` / `to` / `ttl` / `from` — los tres campos que el mesh necesita. Lee el comentario del archivo: *"Designed for mesh from day one… the mesh router is purely additive later."*
- La interfaz **`LocalTransport`** (`_services/transport.ts`) ya direcciona por `endpointId` en `send` y en los eventos — *"Multi-peer by design so a mesh routing layer can sit on top without changing this interface."*
- `_types.ts` ya tiene el campo `peerId?` en `LocalMessage` marcado *"mesh-ready; unused in 1-to-1 UI."*
- `BROADCAST = "*"` ya existe; `makeEnvelope` ya acepta `ttl`.

**Traducción:** el andamiaje de mesh ya está puesto a propósito. **Tu trabajo es aditivo, no un rewrite.** No tocas el wire format ni la forma de la interfaz; agregas una capa de ruteo encima y prendes el multi-peer abajo.

**Lo que falta (las 3 capas):**
1. **Nativo Android** — el módulo solo mantiene **una** conexión; el mesh necesita **muchas** + retransmitir a todas.
2. **JS mesh router** — la lógica de flooding (dedup + TTL + split horizon). **No existe.**
3. **UI** — una sala de broadcast mesh + roster de peers (directo vs por salto).

---

## Decisión de arquitectura — leer antes de tocar nada (ver seam de mesh en `sprint.md`)

### Algoritmo: **managed flooding** (NO ruteo con tablas)

El estándar para una mesh **chica y offline** (decenas de devices, no miles). Tres reglas, nada más:

1. **TTL (time-to-live):** cada `Envelope` nace con un `ttl` (ej. 6). Cada salto lo decrementa en 1. Cuando llega a 0, **no se retransmite más**. Esto es lo que evita que un mensaje viva para siempre dando vueltas.
2. **Dedup por `id`:** cada device recuerda los `id` que ya vio. Si llega un `id` repetido (por otro camino), **se ignora** — no se entrega ni se retransmite. Sin esto, un mensaje se multiplica exponencialmente (broadcast storm).
3. **Split horizon:** cuando retransmites, **NO se lo mandas de vuelta al peer que te lo dio**. Reduce tráfico redundante obvio.

> **Por qué flooding y no ruteo con tablas:** mantener rutas (quién-llega-a-quién) requiere descubrimiento de topología, que es caro y frágil cuando los peers entran y salen de rango cada segundo (alta *churn*). Para esta escala, inundar con TTL + dedup es más simple, más robusto y es lo que usan las mesh chicas de verdad. **No construyas un protocolo de ruteo.**

### Transporte: **Google Nearby Connections `P2P_CLUSTER`** — sin librería nueva

- Hoy el módulo nativo corre en **`Strategy.P2P_POINT_TO_POINT`** (1-a-1, topología de 2 nodos). Mesh = cambiar a **`Strategy.P2P_CLUSTER`** (M-a-N: cada device se conecta a varios a la vez). Es la **misma API de Nearby**, solo otra estrategia.
- **NO se agrega librería** (no Bridgefy, no BLE crudo, no react-native-ble-plx). Se **extiende el módulo Kotlin existente**. Menos superficie, menos riesgo de build, y reusa todo el plumbing de permisos/lifecycle que ya funciona.
- `P2P_CLUSTER` da menos ancho de banda que point-to-point, pero **sobra para texto** — que es exactamente lo que mandamos.

### ⚠️ Dónde vive el código nativo — esto te va a morder si no lo sabes

El módulo Kotlin **NO se edita en `android/`**. Esa carpeta es **generada por `expo prebuild` y está gitignored** (`android/app/src/main/java/com/bluai/app/nearby/NearbyConnectionsModule.kt` no está trackeado). La **fuente de verdad es el config plugin**:

```
frontend/plugins/with-nearby-connections.js
```

El plugin escribe el `.kt` durante prebuild. **Editas el plugin, corres `npx expo prebuild` (o `expo run:android`), y se regenera el nativo.** Si editas el `.kt` directo, tu cambio se borra en el siguiente prebuild. (Esta es la trampa #1 de este workstream — apúntala.)

La línea exacta a cambiar está en **`plugins/with-nearby-connections.js:123`**:

```kotlin
private val strategy: Strategy = Strategy.P2P_POINT_TO_POINT   // → Strategy.P2P_CLUSTER
```

---

## Capa 1 — Nativo Android (`plugins/with-nearby-connections.js`)

> **🔴 Mayor riesgo del sprint, Diego parea/revisa.** Es Kotlin + Nearby + build nativo. Si algo va a pelear, es aquí. Empieza por esto en semana 1 — es el gate (cut criteria #3 en `sprint.md`).

Hoy el módulo asume **una sola conexión** (`connectedEndpointId: String?`) y `sendMessage` la manda implícitamente a ese único peer. Mesh necesita:

1. **Cambiar la estrategia** a `P2P_CLUSTER` (la línea de arriba). Hay un par de comentarios en el plugin (línea ~188) y en el código nativo que mencionan `P2P_POINT_TO_POINT` por nombre — actualízalos para no confundir al siguiente.
2. **Peer map en vez de un solo endpoint.** Cambiar `connectedEndpointId: String?` por un `Map<String, …>` (endpointId → conexión/estado) que aguante **varias conexiones simultáneas**. Aceptar conexiones entrantes de varios peers (en `P2P_CLUSTER` todos advertise + discover a la vez).
3. **`send(endpointId, raw)` real.** Hoy `sendMessage(message)` ignora el destino. Exponer envío **dirigido a un endpointId específico** (Nearby `sendPayload(endpointId, payload)`).
4. **`sendToAll(raw)` / `sendToAllExcept(endpointId, raw)`.** El router necesita inundar a todos los peers conectados — opcionalmente excluyendo uno (split horizon). Puede ser un helper en Kotlin **o** resolverse en JS iterando el roster (ver nota abajo).

**El lado JS de esta capa** (`_services/NearbyTransport.android.ts`) ya está listo para recibir el `endpointId`. El comentario en su `send` lo dice literal:

```
// The current native module tracks a single connection, so the target
// endpointId is implicit. When the Kotlin gains a peer map (mesh prep),
// forward `_endpointId` here — nothing above this line changes.
```

Cuando el Kotlin acepte el destino, quitas el `_` y reenvías `endpointId` a `sendMessage`/`sendPayload`. **Nada arriba de esa línea cambia.**

> **Decisión a tomar con Diego (semana 1):** ¿`sendToAll` vive en Kotlin (un método nativo que itera el peer map) o en JS (el router llama `send(endpointId)` en loop sobre el roster)? **JS es más simple y testeable** (el harness de simulación lo cubre sin tocar nativo) — recomendación: mantener el nativo tonto (`send` dirigido + eventos), y que el fan-out viva en el router JS. Solo baja a Kotlin si el loop JS resulta lento en la demo.

**DoD de la capa:** 3 teléfonos en `P2P_CLUSTER`, los tres conectados entre sí (o en cadena), y `send(endpointId, raw)` entrega a **ese** peer específico, no a "el único". Esto es el **gate de semana 1**.

---

## Capa 2 — JS mesh router (`frontend/app/local-chat/_services/meshRouter.ts`) — *NUEVO archivo*

> **🟢 El corazón del feature y tu terreno, Val. Lógica pura, cero nativo, 100% testeable.** Aquí es donde más valor agregas y donde menos te puede bloquear un build.

Funciones puras sobre el `Envelope` que ya existe. **No importa Nearby, no importa React** — recibe payloads crudos, decide qué hacer, y llama callbacks. Eso lo hace testeable sin hardware (ver sección de Tests).

### Estado interno

- **`seen`: cache acotado de `id` ya vistos.** Esto es dedup. **TIENE que ser acotado** — un `Set` que crece sin límite es un memory leak garantizado en una sesión larga (mismo tipo de bug que el incidente de MapMarkers). Usa un **LRU / ring buffer de ~500 ids**: al llegar al tope, tira el más viejo. 500 cubre de sobra el tráfico de una mesh de emergencia.
- **`peers`: roster** de endpointIds conectados (lo alimenta el transporte vía eventos `onConnected`/`onDisconnected`).

### Lógica — al **recibir** un payload (`onPayload(fromEndpointId, raw)`)

```ts
const env = decode(raw);
if (!env) return;
if (seen.has(env.id)) return;          // 1. dedup — ya lo vi, ignóralo
seen.add(env.id);                      // (LRU: evict si está lleno)

// 2. ¿es para mí? (directo o broadcast) → entregar a la UI
if (env.to === myDeviceId || env.to === BROADCAST) {
  deliverToUI(env);
}

// 3. ¿debo retransmitir? TTL > 1 y no era exclusivamente para mí
if (env.ttl > 1 && env.to !== myDeviceId) {
  const relayed = { ...env, ttl: env.ttl - 1 };          // decrementa TTL
  sendToAllExcept(fromEndpointId, encode(relayed));      // split horizon
}
```

### Lógica — al **enviar** un mensaje nuevo

```ts
const env = makeEnvelope({ from: myDeviceId, to: BROADCAST, body, ttl: 6 });
seen.add(env.id);          // márcalo como visto para no retransmitir tu propio eco
sendToAll(encode(env));    // inunda a todos los peers directos
```

### Notas finas (failure modes que debes manejar)

- **Marca tu propio mensaje como `seen` al enviarlo.** Si no, cuando un peer te lo reboté (o por split horizon mal hecho), lo tratarías como nuevo y lo re-inundarías → eco infinito.
- **`makeEnvelope` default es `ttl: 1`** (porque nació para 1-a-1). Para mesh **debes pasar `ttl: 6`** explícito. No lo olvides — con `ttl:1` no hay salto, solo entrega directa.
- **`decode` es tolerante:** un payload no-JSON regresa un envelope con `ttl: 0` (no se retransmite). Está bien — no rompas eso.
- **`myDeviceId` = el `deviceId` estable** de `identity.ts` (no el `endpointId`, que es efímero por sesión). El `to`/`from` del envelope viajan en deviceId; el `endpointId` solo es el handle de transporte local.
- **TTL inicial = 6** es un default razonable para arrancar. Documenta que es un dial — si la mesh es chica, sobra; si crece, se sube. No lo hardcodees en tres lados; una constante.

---

## Capa 3 — UI (`frontend/app/local-chat/`)

> **🟡 Reusa lo que ya hay.** `local-chat` ya tiene `_components` (ConnectionToggles, ConversationList, PeerList, StatusHero, TechLog), `_context/LocalChatProvider.tsx` (el orquestador), pantallas `index.tsx` / `chat.tsx`. No reinventes.

1. **Sala mesh broadcast.** A diferencia del 1-a-1 (un hilo por peer), el mesh es **una sala compartida**: lo que mandas le llega a todos los alcanzables. Una vista de conversación tipo "grupo" donde los mensajes son `to: BROADCAST`.
2. **Roster de peers — directo vs por salto.** Mostrar quién está **en rango directo** (conexión Nearby viva) vs quién es **alcanzable por salto** (te llegó un mensaje suyo con `from` ≠ un peer directo). Esto hace el mesh **visible** en la demo — es lo que prueba que B retransmitió.
3. **Integración con `LocalChatProvider`.** El provider hoy orquesta el transporte 1-a-1; conéctale el `meshRouter` entre el transporte y la UI. El provider llama `meshRouter.onPayload(...)` en vez de entregar crudo, y `meshRouter.send(...)` al mandar.
4. **`TechLog`** (ya existe) es oro para la demo: muéstralo loggeando saltos (`relayed id=… ttl 5→4`). Hace el multi-salto tangible para quien mira la demo.

**Recordatorio de plataforma (frontend/CLAUDE.md):** normalmente todo cambio debe ser iOS-safe. **El mesh es la excepción explícita de este sprint** — es Android-only (ver Out of Scope). El transporte iOS (`NearbyTransport.ios.ts`) ya es un stub `isAvailable: false`; la UI debe degradar limpio en iOS ("no disponible en iOS todavía"), **no crashear**. No agregues código iOS-only; solo no asumas que el transporte existe.

---

## Tests — simulación en memoria, ANTES del hardware

**No hay test runner de frontend configurado** (ver root `CLAUDE.md`). Pero el `meshRouter` es lógica pura → se prueba con un **harness de simulación en memoria** que corres con `tsx` / `ts-node` (un script, no un framework de test). **Esto es lo que te salva:** depurar flooding con 3 teléfonos físicos es infernal; depurarlo en una simulación de N nodos es trivial.

### El harness

- Modela **N nodos**, cada uno con su propio `meshRouter` (su `seen`, su `myDeviceId`).
- Modela **topología como un grafo de adyacencia** (quién oye a quién). Para el caso clave: **línea `A — B — C — D`** (A solo oye a B, C solo oye a B y D, etc.) — A y D NO se oyen directo.
- `node.send(...)` empuja el payload solo a sus **vecinos directos** en el grafo; cada vecino corre su `onPayload`, que puede retransmitir a **sus** vecinos. Así emulas saltos sin radio.

### Qué debe probar (los 4 invariantes del flooding)

1. **Hop routing:** A manda en `A—B—C` → **C lo recibe** (vía B). El caso que define "mesh".
2. **Dedup:** topología con ciclo (`A—B—C—A`) → cada nodo entrega el mensaje **exactamente una vez**, no N veces.
3. **TTL:** mensaje con `ttl: 2` en una línea `A—B—C—D` → llega a C (2 saltos) pero **NO a D** (se agotó el TTL). Prueba que el TTL corta.
4. **Split horizon:** B no le reenvía a A el mensaje que A le mandó (verificable contando envíos por arista).

> Estos 4 tests corriendo en verde **son tu red de seguridad antes de tocar un teléfono.** Si el router está bien aquí, en hardware solo depuras transporte (capa 1), no lógica.

---

## Estrategia de PRs (≤ 400 líneas cada uno)

1. **Mesh router + harness de simulación** — `meshRouter.ts` (funciones puras: dedup LRU, TTL relay, split horizon) + el harness de N nodos + los 4 tests de invariantes. **Sin nativo, sin UI.** Mergeable y verificable solo (`tsx`). *Empieza por aquí — es lo que más controlas y desbloquea todo lo demás.*
2. **Nativo `P2P_CLUSTER` + peer map** — `plugins/with-nearby-connections.js`: estrategia + multi-conexión + `send(endpointId)` dirigido. Reenviar `endpointId` en `NearbyTransport.android.ts`. **Diego revisa** (toca nativo). Verificable: 3 teléfonos, envío dirigido funciona.
3. **Integración router ↔ transporte** — cablear `meshRouter` dentro de `LocalChatProvider` (transporte → router → UI). Fan-out (`sendToAll`) sobre el roster.
4. **UI sala mesh + roster** — vista broadcast + lista directo-vs-por-salto + TechLog mostrando saltos. Reusa `_components`.
5. **Hardening** — `seen` acotado verificado bajo carga, churn de peers (entran/salen), out-of-range, lifecycle/batería (advertising en background).

---

## DoD

- [ ] `meshRouter.ts` existe como **funciones puras** (no importa Nearby ni React)
- [ ] Dedup por `id` con cache **acotado** (LRU ~500 — no crece sin límite)
- [ ] TTL se decrementa por salto y corta en 0
- [ ] Split horizon: no se retransmite al peer que originó el payload
- [ ] El emisor marca su propio `id` como `seen` (no hay eco infinito)
- [ ] Harness de simulación de N nodos + **4 tests verdes** (hop, dedup, TTL, split horizon) corriendo con `tsx`/`ts-node`
- [ ] Nativo en **`P2P_CLUSTER`** con **peer map** (varias conexiones simultáneas)
- [ ] `send(endpointId, raw)` entrega a un peer **específico** (no al "único")
- [ ] `endpointId` reenviado en `NearbyTransport.android.ts` (quitado el `_`)
- [ ] `meshRouter` cableado en `LocalChatProvider` (transporte → router → UI)
- [ ] UI: sala mesh broadcast + roster directo-vs-por-salto
- [ ] iOS degrada limpio (no crashea; muestra "no disponible")
- [ ] **Demoable en device físico: 3+ teléfonos Android, A y C fuera de rango directo, B en medio → A llega a C vía B**
- [ ] PR(s) ≤ 400 líneas, reviewed por Diego (los que tocan nativo, obligatorio)

---

## Out of Scope (este sprint)

- **iOS mesh.** iOS es stub hoy (`NearbyTransport.ios.ts`, `isAvailable: false`). Mesh en iOS = módulo Swift **MultipeerConnectivity** greenfield (MCSession topa en 8 peers, solo Diego compila/prueba iOS) → **Sprint futuro**. Este sprint el mesh es **Android end-to-end**.
- **Cifrado / autenticación de mensajes mesh.** La mesh es sin confianza por ahora; cualquiera en rango lee/inyecta. Limitación **documentada**; e2e es futuro.
- **Store-and-forward** (encolar mensajes para devices no alcanzables ahora y entregarlos cuando aparezcan) — stretch, NO MVP.
- **Persistencia de mensajes mesh en backend / sync entre devices.** El mesh es efímero y local; no toca FastAPI.
- **Protocolo de ruteo con tablas de topología** — explícitamente NO; managed flooding es la decisión.
- **Optimizar ancho de banda / mensajes grandes / archivos.** Solo texto.

---

## Capacidad — mira la math antes de empezar

~10 días hábiles × 3-4h = **30-40h**.
- Capa 2 (mesh router + harness + 4 tests): ~10-12h — *tu zona, lógica pura, empieza aquí*
- Capa 1 (nativo `P2P_CLUSTER` + peer map + send dirigido): ~12-16h — *el riesgo, con Diego*
- Capa 3 (UI sala mesh + roster + cablear provider): ~8-10h
- Hardening (seen acotado, churn, lifecycle): ~4h

**Total ~34-42h en budget de 30-40h. Tight.** Los dos puntos donde más se pelea:
1. **El cambio nativo a `P2P_CLUSTER` + multi-conexión** (Kotlin + Nearby + el detalle del plugin-genera-el-`.kt`). Es el gate de semana 1; si no está estable al cierre de semana 1, aplica cut criteria #3 (`sprint.md`): degradar mesh a POC + doc de hallazgos, y el router JS se demuestra con el harness.
2. **Churn de peers** (entran/salen de rango): el roster y el `seen` tienen que aguantar que un peer desaparezca a media retransmisión.

Si cualquiera de esos pelea más de 1 día, **flag visible en el grupo el día 3** (principio operativo #2). No lo absorbas en silencio. La válvula de regreso existe: si el nativo no llega, el **router JS + harness de simulación es un entregable válido y demostrable** sin hardware — el mesh real se cierra en Sprint 4. Mesh es lo menos sensible de los tres workstreams (ver `sprint.md`); romperlo no rompe el sprint.
