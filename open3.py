import requests
from geopy.distance import geodesic
from fpdf import FPDF

# Función para buscar lugares cercanos usando Overpass API
def buscar_lugares_cercanos(lat, lon):
    # Consulta para hospitales
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:5000, {lat}, {lon});
      way["amenity"="hospital"](around:5000, {lat}, {lon});
    );
    out body;
    """
    response = requests.get('http://overpass-api.de/api/interpreter', params={'data': query})
    return response.json()

# Coordenadas de La Habana, Cuba
lat = 23.1136
lon = -82.3666

# Define tu clave API
API_KEY = '73d3f6f15ce8ce7055f93bb64dde8486'

# URL de la API de OpenWeatherMap (Clima Actual)
BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

# Parámetros para obtener datos meteorológicos
params = {
    'lat': lat,
    'lon': lon,
    'appid': API_KEY,
    'units': 'metric',
    'lang': 'es'
}

# Realiza la solicitud a la API para obtener datos
response = requests.get(BASE_URL, params=params)

if response.status_code == 200:
    data = response.json()

    # Muestra la ubicación actual
    location_info = "Estás en: La Habana, Cuba"
    coordinates_info = f"Coordenadas: {lat}, {lon}"

    # Muestra datos del clima actual
    weather_info = (
        "Datos del clima actual:\n"
        f"Temperatura: {data['main']['temp']}°C\n"
        f"Descripción: {data['weather'][0]['description']}\n"
        f"Presión: {data['main']['pressure']} hPa\n"
        f"Humedad: {data['main']['humidity']}%\n"
        f"Velocidad del viento: {data['wind']['speed']} m/s\n"
    )

    # Datos del huracán (ejemplo)
    hurricane_location = (20.0, -75.0)  # Coordenadas del huracán
    hurricane_speed_kmh = 30  # Velocidad del huracán en km/h

    # Calcular la distancia desde La Habana
    user_location = (lat, lon)
    distance_km = geodesic(hurricane_location, user_location).kilometers

    # Determinar el nivel de advertencia
    if distance_km < 500:
        alert_level = "Peligro inmediato"
        threshold_distance_km = 500
    elif distance_km < 1000:
        alert_level = "Precaución"
        threshold_distance_km = 1000
    elif distance_km < 2000:
        alert_level = "Alerta"
        threshold_distance_km = 2000
    else:
        alert_level = "Sin peligro"

    # Mensaje según el nivel de advertencia
    report = f"{location_info}\n{coordinates_info}\n{weather_info}\n"
    report += f"El huracán está a {distance_km:.2f} km de tu ubicación. Nivel de alerta: {alert_level}\n"

    if alert_level != "Sin peligro":
        # Calcular el tiempo en horas
        time_hours = distance_km / hurricane_speed_kmh
        time_days = time_hours / 24  # Convertir a días

        report += f"Se espera que llegue en aproximadamente {time_days:.2f} días.\n"

        # Buscar hospitales cercanos
        lugares_cercanos = buscar_lugares_cercanos(lat, lon)

        if lugares_cercanos['elements']:
            report += "Hospitales cercanos:\n"
            for lugar in lugares_cercanos['elements']:
                if 'tags' in lugar:
                    nombre = lugar['tags'].get('name', 'Sin nombre')
                    report += f"- {nombre} (hospital)\n"
        else:
            report += "No se encontraron hospitales cercanos.\n"
    else:
        report += "No se espera que el huracán pase cerca de ti.\n"

    # Crear un PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, report)

    # Guardar el PDF
    pdf.output("informe_huracanes.pdf")

    print("El informe se ha guardado en 'informe_huracanes.pdf'.")
else:
    print(f"Error al obtener información: {response.status_code}, {response.text}")
