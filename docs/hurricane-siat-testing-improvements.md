# Mejoras — Pruebas de Huracanes / SIAT

Objetivo: que el panel de alertas de desarrollo permita **crear cualquier tormenta, donde sea, con los parámetros que queramos**, **verla en el mapa**, y que el nivel del semáforo SIAT **considere hacia dónde va realmente la tormenta** (no solo qué tan cerca está).

> Contexto para quien lo tome:
> - Las tormentas viven en la tabla `cyclone_events`. El endpoint de inyección `POST /api/v1/siat/inject-cyclone` ya acepta `lat`, `lon`, `wind_kmh`, `movement_speed_kmh` y `name` personalizados. El backend ya está casi listo — la mayor parte de este trabajo es frontend + un cambio en el cálculo del nivel.
> - "Tormenta" es el término paraguas. Un **Huracán** es solo la categoría de intensidad con viento ≥ 119 km/h (por debajo es Tormenta Tropical / Depresión). No hardcodees "huracán" — deriva la categoría del viento.
> - Dos ideas separadas, no las mezcles: **clasificación** (intensidad → la etiqueta/ícono) vs **nivel SIAT** (cercanía + dirección → el color del semáforo que recibe el usuario).

Hacerlas en orden

---

## 1. Nivel SIAT según dirección (solo backend) — empezar por aquí

**Resultado:** el nivel de alerta depende de si la tormenta **va hacia** el usuario, no solo de la distancia.

- Una tormenta que va directo hacia Acapulco → nivel alto para Acapulco.
- La misma tormenta, vista desde CDMX que queda de lado → nivel más bajo.
- Una tormenta que ya pasó y se está alejando → se baja el nivel.

Hoy el nivel ignora por completo la dirección, así que "acercándose" y "alejándose" dan el mismo resultado. Ya recibimos el rumbo + la velocidad de la tormenta (las reales desde NHC, las falsas desde el formulario) — solo que aún no los usamos.

**Regla de seguridad:** nunca bajar por debajo de lo que la pura distancia ya justificaría. Una tormenta a 80 km que se "aleja" sigue sin ser luz verde. Ante la duda, alertar de más.

**Limpieza necesaria en el camino:** el rumbo de la tormenta llega como número para las reales pero como texto de brújula ("NW") para las falsas — haz que ambos produzcan el mismo rumbo numérico para que el cálculo funcione. Agrega pruebas unitarias (este camino lo cubre CI).

---

## 2. Crear tormentas desde el panel de desarrollo (frontend)

**Resultado:** reemplazar los 3 botones de presets hardcodeados por un formulario real.

- Elegir la **ubicación** tocando el mapa (rellena lat/lon) o escribiéndola.
- Definir **nombre**, **viento**, **velocidad de movimiento** y **rumbo/dirección**.
- Enviar → se crea la tormenta y corre un ciclo SIAT (endpoint existente, sin cambios de backend más allá del #4).
- Mantener una acción de "reiniciar mi estado SIAT" para volver a probar el escalamiento sin cambiar la tormenta.

---

## 3. Pintar las tormentas en el mapa (frontend + 1 endpoint pequeño de backend)

**Resultado:** tanto las tormentas reales como las falsas aparecen en el mapa, no solo como notificación.

- Nuevo endpoint de lectura para listar las tormentas activas desde `cyclone_events` (lat/lon/viento/rumbo/velocidad/categoría).
- Un marcador por tormenta en el mapa; etiquetarlo por su **categoría real** (Huracán / Tormenta Tropical / Depresión) según el viento — no siempre "huracán".
- Usar rumbo + velocidad para dibujar una flecha de dirección simple, para ver hacia dónde va.
- La tormenta debe seguir ahí después de recargar la app (para eso es el endpoint de lectura).

---

## 4. Corregir la etiqueta de categoría de la tormenta (fix pequeño de backend, va junto con el #3)

**Resultado:** una tormenta se etiqueta según su intensidad real.

- Ahora mismo cada tormenta inyectada se marca como "huracán" sin importar el viento. Deriva la categoría del `wind_kmh` (≥119 → Huracán, ≥63 → Tormenta Tropical, si no → Depresión) para que las falsas se etiqueten igual que las reales.

---

## Fuera de alcance (después, no hacerlo ahora)

- Usar el **cono de pronóstico oficial de NHC** (la trayectoria curva real). El trabajo de dirección del #1 es una aproximación en línea recta — suficiente para el semáforo, pero una tormenta puede curvarse de regreso. El cono es la mejora futura, no parte de esto.
