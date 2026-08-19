# Sprint 4 — 6 al 14 de agosto 2026

**Cierre: viernes 14 de agosto.** No se mueve.

> El doc de Pendientes dice "16 de agosto", pero ese día es domingo. El último día hábil es el viernes 14, así que esa es la fecha real.

El sprint arrancó el **jueves 6** y cada quien ya tiene lo suyo. Este documento no reparte trabajo nuevo — **ordena lo que ya hay** y explica por qué algunas cosas van antes que otras.

El detalle técnico de cada quien está en `diego_sprint_4.md`, `edgar_sprint_4.md` y `val_sprint_4.md`.

---

## Quién lleva qué

| | Trabajo principal |
|---|---|
| **Diego** | Salida de iOS · IA (herramientas, mensaje de protección) · backend en general · Bugs generales |
| **Val** | Cobros web · Planes de pago en la app · GPS familiar |
| **Edgar** | Todo lo de alertas (semáforo SIAT, trayectoria) · Bluetooth mesh al final |

Quedan **5 días hábiles** (lunes 10 a viernes 14). **La semana de Val es la más cargada del sprint** — tres cosas que hoy no funcionan y todas son de dinero. Si algo se cae, que sea de otro lado.

---

## Lo primero: tres cosas de orden

Tres casos donde **hacer algo antes que otra cosa** nos ahorra un problema.

### 1. 🔴 Las alertas nacionales se rompen si pasamos de 500 dispositivos — y la campaña es el lunes 17

Hoy, cuando sale una alerta nacional, el sistema junta los dispositivos de todos los usuarios y los manda **en un solo envío**. Firebase solo acepta **500 por envío**. Si tenemos más de 500 dispositivos registrados, ese envío falla completo y **la alerta no le llega absolutamente a nadie** — y solo queda un error en el log, sin aviso a nadie.

Ahorita no hay problema porque somos pocos. **El problema es que la primera tanda de posteos en redes y la campaña de medios están agendadas para el lunes 17 de agosto.** Si esa campaña nos mete registros y cruzamos los 500, el sistema de alertas deja de funcionar justo cuando empieza a importar.

→ **Diego lo arregla antes del cierre del viernes 14.** Es partir el envío en grupos de 500. Media hora.

### 2. 🔴 Antes de los planes de pago hay que cerrar un hueco de datos

Hoy existe un punto del servidor donde **cualquier usuario con cuenta puede pedir los datos de otro usando solo su número de ID**, y el servidor responde con **nombre real y teléfono**. Como los IDs son números seguidos (1, 2, 3...), alguien puede recorrerlos y **bajarse el directorio completo**: nombres y teléfonos de todos. Además queda registrado como "contacto vinculado" del otro, que recibe una notificación de que lo agregaron.

Val va a construir esta semana qué desbloquea cada plan — o sea, **permisos**. Construir permisos encima de un servidor que hoy le cree a un número que viene en la URL es empezar mal. La verificación que falta **ya existe en otra parte del código**; solo hay que ponerla también aquí.

→ **Val lo cierra antes de tocar planes.** Medio día.

### 3. 🟠 Arreglar el congelamiento de la IA antes de agregarle herramientas

Cada vez que alguien manda un mensaje al asistente, **el servidor se queda ocupado y no atiende nada más**: ni otras pantallas, ni otros usuarios, **ni la revisión automática de huracanes** que corre cada 30 minutos.

→ **Diego: primero el arreglo (2 h), después las herramientas.**

---

## Lo primero de todo — una hora

**Desbloquear a Iván con el tutorial.** Su material ya está hecho; está esperando que Diego le diga qué necesita. Es una conversación. *(Diego)*

---

## Val

| Tarea | Por qué / qué implica |
|---|---|
| 🔴 **Cobros en el sitio web** | Hoy **no funciona nada** del cobro. Es la única vía de ingreso del producto. **Antes de diseñar nada: `docs/specs_july05/edgar_sprint_3.md` ya tiene la especificación completa** (tablas, endpoints, flujo de Stripe, cómo se conecta el pago con la cuenta). La especificación existe, el código no. **Úsala como plan — no la rediseñes.** |
| 🔴 **Planes de pago en la app** | Hoy tampoco funciona. Que la app lea qué plan tiene el usuario y desbloquee según eso. **iOS no lleva botón de compra** (regla de App Store) — solo lee el plan y abre lo que corresponde. La decisión ya está tomada desde el sprint pasado; no se re-discute. |
| 🔴 **GPS de membresía familiar — funcional, testeado y con demo** | Hoy no funciona. La meta no es "que exista": es **que se pueda demostrar funcionando**. |
| 🔴 **Cerrar el hueco de datos de usuarios** (medio día) | Ver punto 2 de arriba. Va **antes** de los planes porque los planes son permisos. |
| 🟠 **Separar los datos por cuenta al cerrar sesión** | Hoy la app **guarda todo sin separar por cuenta** — ubicación, notificaciones, historial y la cola de SOS pendientes van al mismo lugar para todos, y al cerrar sesión **no se borra nada**. El caso real: alguien deja un SOS pendiente sin internet, cierra sesión, entra otra persona en el mismo teléfono, vuelve la señal, y **se manda el SOS de la primera desde la cuenta y la ubicación de la segunda**. "Membresía familiar" significa exactamente teléfonos compartidos, así que esto va junto con el GPS familiar, no después. La mitad barata (borrar datos y desregistrar notificaciones al salir) es rápida. |

---

## Diego

| Tarea | Por qué |
|---|---|
| 🔴 **Salida de iOS** | **Lo único con compromiso externo.** Hay gente de fuera esperando la versión de iPhone para poder verla y probarla. Nada le gana a un compromiso con alguien de fuera. |
| 🔴 **Partir el envío de alertas en grupos de 500** | Sin esto, la alerta nacional deja de llegarle a todos en cuanto pasemos de 500 dispositivos. **Gate: miércoles 12.** |
| 🔴 **Quitar el congelamiento de la IA** (2 h) | Un mensaje de IA deja el servidor ocupado y frena hasta la revisión de huracanes. Desbloquea el resto de su semana. |
| 🔴 **Mensaje de protección sobre IA** | Que el usuario entienda que la IA orienta pero no sustituye a Protección Civil ni a un médico, y que la decisión final es suya. Va **visible en el flujo**, no escondido en Ajustes. |
| 🔴 **Límite de uso en el asistente de IA** | No hay tope de tamaño ni de frecuencia, y cada consulta cuesta dinero. Se conecta con los planes de pago. |
| 🟠 **Herramientas adicionales para el asistente** | Después del arreglo de congelamiento. |
| 🟠 **Tutorial al instalar la app** | Bloqueado en él — Iván solo necesita una conversación de una hora. Ver arriba. |
| 🟠 **Arreglar el onboarding: hoy termina antes de guardar el teléfono** | El onboarding marca "completado" **antes** de confirmar que el teléfono se guardó en el servidor, y si esa llamada falla **el error se descarta en silencio**. Resultado: con mala señal, un usuario queda registrado como listo pero **sin teléfono en el servidor** — y como los contactos SOS se buscan por teléfono, **nadie puede invitarlo nunca como contacto de emergencia**. No hay mensaje de error, no hay reintento, y ni él ni quien lo invita se enteran. Va junto con el tutorial: son la misma primera experiencia. |
| 🟡 **Imagen de Docker del backend para migración a GCP** | Solo la imagen — sirve para cualquier destino y es el paso 0 de la migración del siguiente sprint. **Condición: si se abre la pregunta del tamaño de la imagen** (el backend jala ~1 GB de torch más ~470 MB del modelo de búsqueda) **o la de separar el servicio de IA del API, párale y déjalo para el siguiente sprint.** Eso ya es decisión de arquitectura, no una tarea suelta. |
| 🟡 **Banners de Google · Ícono de huracanes · Ajustes del sitio** | Al final. |

---

## Edgar

**Orden: primero todo lo de alertas** (lo que ya traía), **y el Bluetooth al final.**

| Tarea | Por qué |
|---|---|
| 🟠 **Semáforo de colores y peligrosidad SIAT** | Hoy **un mismo evento se ve de tres formas distintas**: la notificación dice un color ("Alerta SIAT-CT Amarillo"), la app dice una fase ("Nivel 3 / Preparación"), y el mapa lo pinta de otro color. Hay **seis definiciones distintas** de nivel→color→nombre repartidas entre app, servidor y el documento de marca, y **no coinciden entre sí** — hasta los nombres de fase están corridos un escalón entre servidor y app. El documento de marca dice que un color *no* se use para severidad, y la app lo usa. **Lo que tiene que salir: una sola definición, y que todos la lean.** |
| 🟡 **Dejar de mandar datos personales a Sentry** (2 h) | La app manda a un servicio externo de monitoreo los **teléfonos de contactos SOS, las ubicaciones GPS y los links de invitación**, atados a un usuario identificado por nombre y correo — y además graba video de sesión en parte de los casos. Dos cambios chicos: una línea de configuración que quita los mensajes de depuración de las versiones publicadas, y borrar a mano los peores. **Lo más barato del sprint por lo que evita.** |
| 🟡 **Que un usuario ciego pueda mandar un SOS** (~1 día) | El botón de SOS no tiene etiqueta y su único contenido es un ícono, así que el lector de pantalla no puede decir qué es. En una app de emergencias eso no es un detalle. Solo el camino crítico: botón de SOS, pantalla de alarma y las pestañas. |
| 🟡 **Trayectoria del huracán** | Ojo: la consulta de eventos del mapa hoy trae todo sin filtrar y no hay índices en la base — si le agregas carga, cuenta con eso. |
| ⬜ **Bluetooth mesh** — *cuando lo de alertas esté cerrado* | La tarea grande del sprint para él. **Necesario avanzar en este sprint y dejar algo funcional.** Ver abajo. |

### Bluetooth mesh — la meta

Hoy dos teléfonos se hablan solo si están **directamente** a rango uno del otro. Mesh es que el mensaje **salte de teléfono en teléfono**: si A no alcanza a C pero B está en medio, el mensaje de A llega a C **pasando por B**. En un huracán, sin señal ni luz, es la diferencia entre un chat de 30 metros y uno que cubre una colonia.

**Es la tarea grande del sprint y no se termina en una semana.** Lo que sí tiene que haber el viernes 14 es **algo funcional y demostrable** — aunque sea una parte, enseñable en teléfonos reales. Detalle técnico y dónde está el piso exacto: `edgar_sprint_4.md`.

**Nunca a costa de romper el chat uno-a-uno que hoy sí funciona.**

> **Ojo con iOS:** el chat Bluetooth **no existe en iPhone**. Como esta semana sale la versión de iOS, que Iván y Vic lo sepan antes de grabar el tutorial o prometerlo en campaña: **es una función solo de Android.**

---

## Si alcanza — y si no, siguiente sprint

Ninguna es crítica esta semana. Si el tiempo alcanza, entran; si no, van al siguiente sprint.

| Tarea | Nota |
|---|---|
| **Versión en inglés de la app** | Son **todos** los textos de la aplicación, no una pantalla. Es un frente completo por sí solo. |
| **Reentrenamiento de la IA** | Falta definir si es actualizar el contenido que consulta o cambiar el modelo — y el segundo caso toca cómo arranca el servidor. |
| **Compartir en WhatsApp el mapa o las notificaciones** *(Edgar, Vic)* | Compartir el **mapa** o una **alerta** no tiene problema. Lo que **no** debe compartirse por ahí son los links de invitación a contactos SOS — hoy cualquiera que reciba ese link puede aceptarlo aunque no fuera para él (ver "Lo que NO entra"). |
| **Directorio de Clínicas y Hospitales para la IA** *(Vic, Diego)* | Es lo que la IA consulta para recomendar a dónde ir en una emergencia. El trabajo es mitad contenido (Vic lo arma) y mitad cargarlo a la base que consulta la IA. Se conecta con el reentrenamiento. |

---

## Lo que NO entra

Anotados para que no se olviden.

**Decisiones ya tomadas:**
- **Seguridad antirobo** — diferido por decisión de Diego; falta definir qué incluye.

**Pendientes conocidos:**

| Qué | Por qué duele dejarlo |
|---|---|
| **Invitaciones de SOS: cualquiera con el link puede aceptarla** | Lo más doloroso de diferir. Quien reciba un link reenviado queda como contacto de emergencia de esa persona y recibe su ubicación. **Primero de la fila el próximo sprint.** |
| **Si el proveedor de huracanes se cae, se ve igual que "no hay huracanes"** | Cuando la fuente de ciclones falla o tarda, el sistema recibe una lista vacía — **exactamente lo mismo que recibe cuando de verdad no hay nada**. Una caída sostenida *durante un huracán real* produce ciclos que se ven perfectamente sanos, cero alertas, y ningún aviso a nadie. **De lo que queda pendiente, esto es lo más grave**: falla en silencio y con cara de que todo está bien. |
| **"3 contactos notificados" no son 3 personas, y la cola de SOS solo se vacía en el mapa** | El número cuenta **dispositivos** que Firebase aceptó, no personas ni lecturas: un contacto con celular y tablet aparece como 2. Y la cola dice "se enviará cuando recuperes conexión", pero **nada está escuchando cuándo vuelve la señal** — solo se reintenta al abrir la app o al entrar a la pantalla del mapa. Alguien en un refugio que recupera señal en otra pantalla se queda esperando. |
| **Se marca "notificado" aunque el aviso no haya salido** | Si a alguien no le llegó su alerta, el sistema cree que sí y no lo reintenta. |
| **Los avisos salen antes de guardarse** | Si algo falla a media revisión, lo ya enviado no queda registrado y **se vuelve a mandar la misma alerta a la misma gente** en el siguiente ciclo. |
| **El chat de IA guarda todo el historial en disco con cada palabra** | Mientras el asistente escribe la respuesta, la app reescribe la conversación completa en el teléfono palabra por palabra. Traba la interfaz y gasta batería justo cuando alguien está pidiendo indicaciones por una tormenta. |
| **Borrar cuenta no borra los datos** | Requiere diseño: hoy la base de datos no deja borrar a un usuario que alguna vez usó SOS. |
| **La conexión con la fuente SMN no valida el certificado** | Puede ser un arreglo de una línea o un día entero. No queremos esa incertidumbre esta semana. |
| **Varias pantallas no reintentan ni avisan bien cuando falla el internet** | Incluye la pantalla de contactos SOS y el envío del SOS mismo. |
| **Cualquiera puede reportar un evento en el mapa desde donde sea** | La regla de distancia solo vive en la app, no en el servidor. |
| **No hay pruebas automáticas de la app** | Es un sprint completo por sí solo. |

---

## Revisión — miércoles 12, sí o no

- ¿**Envío de alertas partido en grupos de 500?** ← el importante, la campaña es el lunes 17
- ¿Cerrado el hueco de datos antes de que Val toque planes?
- ¿Cobros web avanzando de verdad, o atorado?
- ¿Build de iOS en camino a manos externas?
- ¿Semáforo con una sola definición de colores?

---

## Si algo se atora

| Situación | Qué hacer |
|---|---|
| iOS pelea más de 2 días | Cortar herramientas de IA y banners. **iOS gana**, tiene compromiso externo. |
| El envío por grupos de 500 no está el viernes 14 | **Parar todo y hacerlo.** Es media hora y la campaña arranca el lunes 17. |
| Val no llega con todo | Prioridad: **cobros web → planes en la app → GPS familiar**. El hueco de datos se cierra igual, es medio día. |
| Edgar no termina el semáforo | Que salga la definición única en servidor y lista de alertas; el mapa se difiere. Lo importante es que **exista una sola fuente de verdad**. |
| Edgar no alcanza el Bluetooth mesh | Es lo último de su lista a propósito: **las alertas van primero**. Que quede la parte que sí funciona y una nota de qué faltó. **Nunca a costa de romper el chat uno-a-uno que hoy sirve.** |
| Cualquiera se atora más de un día | Decirlo en el grupo **el mismo día**. No absorberlo en silencio. |

---

## Después del 14

Junta los tres. En la fila para el siguiente sprint:

1. **Invitaciones de SOS** — que solo las pueda aceptar la persona a la que iban dirigidas
2. **Borrado de cuenta** de verdad
3. **Versión en inglés de la app**
4. **Reentrenamiento de la IA**
5. **Pruebas automáticas** de la app
6. **Migración del backend a GCP**

**Por qué la migración va ahí y no aquí:** migrar ahora que no hay usuarios reales es lo correcto — es el momento más barato que va a existir, y esa ventana se cierra con la campaña. No entra esta semana porque antes hay que **sacar la revisión automática de huracanes del proceso del servidor web**: hoy vive dentro de la misma aplicación y funciona porque corre una sola instancia. En una plataforma que prende y apaga instancias sola, esa revisión **o nunca corre, o corre varias veces y duplica las alertas** — y aun así **la migración se vería exitosa**. Ese arreglo vale la pena aunque nunca migremos.

**La conversación de fondo para esa junta:** quedan varios pendientes de seguridad en una app de emergencias. El siguiente sprint debería ser mayormente eso — o hay que decir en voz alta que no lo va a ser.
