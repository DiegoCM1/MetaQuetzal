import streamlit as st
from langchain_ollama import ChatOllama
import requests

# Funciones Auxiliares
def buscar_lugares_cercanos(lat, lon):
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:5000, {lat}, {lon});
      node["emergency"="shelter"](around:5000, {lat}, {lon});
    );
    out body;
    """
    response = requests.get('http://overpass-api.de/api/interpreter', params={'data': query})
    return response.json()

def obtener_clima(lat, lon):
    API_KEY = '73d3f6f15ce8ce7055f93bb64dde8486'
    BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY,
        'units': 'metric',
        'lang': 'es'
    }
    response = requests.get(BASE_URL, params=params)
    return response.json() if response.status_code == 200 else None

# Configuración de la aplicación
st.set_page_config(page_title="Chatbot de Emergencias", page_icon="🧠")

# Título principal
st.title("🧠 Chatbot de Emergencias con Información Importante")

# Implementación con pestañas
tab1, tab2, tab3, tab4 = st.tabs(["Formulario de Emergencias", "Chatbot", "Números de Emergencia", "Mapa Meteorológico"])

# Tab: Formulario de Emergencias
with tab1:
    st.subheader("Formulario de Conducta en Emergencias")
    st.markdown("Por favor, completa las siguientes preguntas para evaluar tu comportamiento en situaciones de emergencia.")

    # Pregunta 1: Emociones durante la emergencia
    emociones = st.multiselect(
        "Cuando ocurre una emergencia, ¿cómo te sientes generalmente?",
        ["Ansioso", "Calmo", "Confundido", "Asustado", "Motivado a actuar", "Indiferente", "Enojado"],
        help="Selecciona todas las emociones que describan cómo te sientes durante una emergencia."
    )

    # Pregunta 2: Acciones durante la emergencia
    acciones = st.selectbox(
        "¿Qué haces en una situación de emergencia?",
        ["Busco ayuda de inmediato", "Grito o grito a los demás", "Intento calmar a otros", 
         "Me quedo paralizado y no sé qué hacer", "Actúo con determinación para resolver la situación"],
        help="Selecciona la acción que mejor describe cómo actúas en emergencias."
    )

    # Pregunta 3: Emociones después de la emergencia
    emociones_post = st.multiselect(
        "Después de enfrentar una emergencia, ¿cómo te sientes?",
        ["Aliviado", "Culpable", "Orgulloso de mi respuesta", "Ansioso", "Triste", "Confuso"],
        help="Selecciona todas las emociones que experimentas después de enfrentar una emergencia."
    )

    # Pregunta 4: Comentarios adicionales
    comentarios = st.text_area(
        "Comentarios adicionales sobre tu experiencia en emergencias (opcional):",
        placeholder="Por ejemplo: 'Me cuesta tomar decisiones rápidas' o 'No sé cómo pedir ayuda.'"
    )

    # Botón para enviar
    submit = st.button("Enviar", key="form_submit")

    if submit:
        # Validación: comprobar que al menos una sección esté completada
        if emociones or acciones or emociones_post or comentarios:
            # Configuración del modelo Ollama
            model = ChatOllama(model="llama3.2:1b", base_url="http://localhost:11434/")
            
            # Construcción del prompt para Ollama
            prompt = (
                f"Eres un experto en manejo de emergencias. A continuación, se presentan las respuestas de un usuario:\n\n"
                f"1. Emociones durante una emergencia: {', '.join(emociones) if emociones else 'No especificado'}\n"
                f"2. Acción en una emergencia: {acciones}\n"
                f"3. Emociones después de la emergencia: {', '.join(emociones_post) if emociones_post else 'No especificado'}\n"
                f"4. Comentarios adicionales: {comentarios if comentarios else 'No especificado'}\n\n"
                f"Proporciona una recomendación personalizada y específica basada en estas respuestas para que el usuario mejore su manejo de emergencias."
            )

            # Invocación del modelo Ollama
            with st.spinner("Generando recomendación..."):
                try:
                    response = model.invoke(prompt).content
                    if "Lo siento" in response or not response.strip():
                        response = "Asegúrate de proporcionar detalles útiles para que podamos darte una mejor recomendación."
                except Exception as e:
                    response = f"Error al generar recomendación: {str(e)}"

            # Mostrar recomendación
            st.success(f"Recomendación generada:\n\n{response}")
        else:
            st.warning("Por favor, completa al menos una sección del formulario para obtener una recomendación.")

# Tab: Chatbot
with tab2:
    st.subheader("Chatbot de Emergencias")

    model = ChatOllama(model="llama3.2:1b", base_url="http://localhost:11434/")

    # Obtener ubicación del usuario por IP
    g = requests.get('http://ip-api.com/json').json()
    lat = g.get('lat')
    lon = g.get('lon')
    user_location = f"{g.get('city')}, {g.get('regionName')}, {g.get('country')}"

    if 'chat_history' not in st.session_state:
        st.session_state['chat_history'] = []

    text_input = st.text_area("Escribe tu pregunta o comentario:", key="chat_input")
    submit_chat = st.button("Enviar Chat", key="chat_submit")

    if submit_chat and text_input:
        with st.spinner("Generando respuesta..."):
            prompt = f"Usuario se encuentra en {user_location}. Pregunta: {text_input}\nAsistente:"
            response = model.invoke(prompt).content
            st.session_state['chat_history'].append({"user": text_input, "ollama": response})
    
    st.write("## Historial de Chat")
    for chat in reversed(st.session_state['chat_history']):
        st.write(f"**🧑 Usuario**: {chat['user']}")
        st.write(f"**🧠 Asistente**: {chat['ollama']}")
        st.write("---")

# Tab: Números de Emergencia en México
with tab3:
    st.subheader("Números de Emergencia en México")
    st.markdown("""
    A continuación, se presentan los números más importantes de emergencia en México:
    
    - **911**: Número general para emergencias (policía, ambulancia, bomberos).
    - **065**: Cruz Roja.
    - **089**: Denuncia anónima.
    - **800 822 87 22**: Protección Civil.
    - **074**: Auxilio vial en carreteras.
    - **01800 911 2000**: Información sobre centros de atención en caso de desastres naturales.
    
    ### Recomendaciones
    Guarda estos números en tu teléfono móvil para acceder a ellos rápidamente en caso de necesidad.
    """)

# Tab: Mapa Meteorológico
with tab4:
    st.subheader("Mapa Meteorológico")
    map_html = """
    <!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapa Meteorológico</title>
    <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            display: flex;
            overflow: hidden;
        }
        #map {
            width: 100%;
            height: 100vh;
        }
        #hurricane-iframe {
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            border: none;
            z-index: 10;
        }
        .controls {
            position: absolute;
            top: 10px;
            left: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
            z-index: 20;
        }
        .controls label {
            display: block;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <iframe id="hurricane-iframe" src="" allowfullscreen></iframe>

    <div class="controls">
        <label><input type="checkbox" id="temperature"> Temperatura Actual</label>
        <label><input type="checkbox" id="precipitation"> Precipitaciones</label>
        <label><input type="checkbox" id="humidity"> Humedad</label>
        <label><input type="checkbox" id="wind"> Viento</label>
        <label><input type="checkbox" id="pressure"> Presión Atmosférica</label>
        <label><input type="checkbox" id="hurricanes"> Huracanes</label>
    </div>

    <script src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"></script>
    <script>
        mapboxgl.accessToken = 'pk.eyJ1IjoieHlsb24xMiIsImEiOiJjbTJoYWI1MW0wYWZwMnZxODJ3cGdwN3VrIn0.GTcHIHFeFAUYtvzRwbLDBA';
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-99.1332, 19.4326],
            zoom: 5
        });

        const toggleLayer = (layerId, checkbox) => {
            if (checkbox.checked) {
                map.setLayoutProperty(layerId, 'visibility', 'visible');
            } else {
                map.setLayoutProperty(layerId, 'visibility', 'none');
            }
        };

        // Muestra el iframe de huracanes
        const showHurricaneIframe = (isChecked) => {
            const iframe = document.getElementById('hurricane-iframe');
            if (isChecked) {
                iframe.src = "https://www.rainviewer.com/map.html?loc=20.5147,-99.9146,5&oCS=1&c=3&o=83&lm=1&layer=sat-rad&sm=1&sn=1";
                iframe.style.display = 'block';
                document.getElementById('map').style.opacity = '0';
            } else {
                iframe.style.display = 'none';
                iframe.src = "";
                document.getElementById('map').style.opacity = '1';
            }
        };

        // Añadir geolocalización
        const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
        });
        map.addControl(geolocateControl);

        // Añadir capas climáticas de OpenWeatherMap
        map.on('load', () => {
            // Capa de temperatura
            map.addSource('temperature', {
                'type': 'raster',
                'tiles': [
                    'https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=3440360a0f138f52f28d20c65cc61f07'
                ],
                'tileSize': 256
            });
            map.addLayer({
                'id': 'temperature-layer',
                'type': 'raster',
                'source': 'temperature',
                'paint': { 'raster-opacity': 0.6 }
            }, 'water');

            // Capa de precipitaciones
            map.addSource('precipitation', {
                'type': 'raster',
                'tiles': [
                    'https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=3440360a0f138f52f28d20c65cc61f07'
                ],
                'tileSize': 256
            });
            map.addLayer({
                'id': 'precipitation-layer',
                'type': 'raster',
                'source': 'precipitation',
                'paint': { 'raster-opacity': 0.6 }
            }, 'water');

            // Capa de humedad
            map.addSource('humidity', {
                'type': 'raster',
                'tiles': [
                    'https://tile.openweathermap.org/map/humidity_new/{z}/{x}/{y}.png?appid=3440360a0f138f52f28d20c65cc61f07'
                ],
                'tileSize': 256
            });
            map.addLayer({
                'id': 'humidity-layer',
                'type': 'raster',
                'source': 'humidity',
                'paint': { 'raster-opacity': 0.6 }
            }, 'water');

            // Capa de viento
            map.addSource('wind', {
                'type': 'raster',
                'tiles': [
                    'https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=3440360a0f138f52f28d20c65cc61f07'
                ],
                'tileSize': 256
            });
            map.addLayer({
                'id': 'wind-layer',
                'type': 'raster',
                'source': 'wind',
                'paint': { 'raster-opacity': 0.6 }
            }, 'water');

            // Capa de presión
            map.addSource('pressure', {
                'type': 'raster',
                'tiles': [
                    'https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=3440360a0f138f52f28d20c65cc61f07'
                ],
                'tileSize': 256
            });
            map.addLayer({
                'id': 'pressure-layer',
                'type': 'raster',
                'source': 'pressure',
                'paint': { 'raster-opacity': 0.6 }
            }, 'water');

            // Eventos de checkboxes
            document.getElementById('temperature').addEventListener('change', (e) => toggleLayer('temperature-layer', e.target));
            document.getElementById('precipitation').addEventListener('change', (e) => toggleLayer('precipitation-layer', e.target));
            document.getElementById('humidity').addEventListener('change', (e) => toggleLayer('humidity-layer', e.target));
            document.getElementById('wind').addEventListener('change', (e) => toggleLayer('wind-layer', e.target));
            document.getElementById('pressure').addEventListener('change', (e) => toggleLayer('pressure-layer', e.target));
            document.getElementById('hurricanes').addEventListener('change', (e) => showHurricaneIframe(e.target.checked));
        });
    </script>
</body>
</html>
    """
    st.components.v1.html(map_html, height=600)
