import requests
import geocoder
from geopy.distance import geodesic
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# Función para buscar lugares cercanos usando Overpass API
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

# Datos del huracán (ejemplo)
hurricane_location = (20.0, -75.0)  # Coordenadas del huracán
hurricane_speed_kmh = 30  # Velocidad del huracán en km/h

# Obtén la ubicación actual del usuario
g = geocoder.ip('me')

if g.ok:
    lat = g.latlng[0]
    lon = g.latlng[1]

    # Define tu clave API
    API_KEY = '73d3f6f15ce8ce7055f93bb64dde8486'

    # URL de la API de OpenWeatherMap
    BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY,
        'units': 'metric',
        'lang': 'es'
    }

    response = requests.get(BASE_URL, params=params)

    if response.status_code == 200:
        data = response.json()

        # Calcular la distancia desde la ubicación actual hasta el huracán
        user_location = (lat, lon)
        distance_km = geodesic(hurricane_location, user_location).kilometers

        # Determinar el nivel de advertencia
        if distance_km < 500:
            alert_level = "Peligro inmediato"
        elif distance_km < 1000:
            alert_level = "Precaución"
        elif distance_km < 2000:
            alert_level = "Alerta"
        else:
            alert_level = "Sin peligro"

        # Información del clima
        clima_info = (
            f"Informe de Huracanes\n"
            f"Estás en: {g.city}, {g.state}, {g.country}\n"
            f"Coordenadas: {lat}, {lon}\n\n"
            f"Datos del clima actual:\n"
            f"Temperatura: {data['main']['temp']}°C\n"
            f"Descripción: {data['weather'][0]['description']}\n"
            f"Presión: {data['main']['pressure']} hPa\n"
            f"Humedad: {data['main']['humidity']}%\n"
            f"Velocidad del viento: {data['wind']['speed']} m/s\n"
            f"El huracán está a {distance_km:.2f} km de tu ubicación. Nivel de alerta: {alert_level}\n"
        )

        # Buscar lugares cercanos (hospitales y refugios)
        lugares_cercanos = buscar_lugares_cercanos(lat, lon)
        hospitales_info = "Hospitales cercanos:\n"
        refugios_info = "Refugios de emergencia cercanos:\n"
        
        if lugares_cercanos['elements']:
            for lugar in lugares_cercanos['elements']:
                nombre = lugar['tags'].get('name', 'Sin nombre')
                tipo = lugar['tags'].get('amenity', lugar['tags'].get('emergency', 'Desconocido'))
                if 'hospital' in tipo:
                    hospitales_info += f"- {nombre} (Hospital)\n"
                elif 'shelter' in tipo:
                    refugios_info += f"- {nombre} (Refugio)\n"
        else:
            hospitales_info += "No se encontraron hospitales cercanos.\n"
            refugios_info += "No se encontraron refugios cercanos.\n"

        # Crear PDF
        c = canvas.Canvas("informe_huracan.pdf", pagesize=letter)

        # Añadir título
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "Informe de Huracanes")

        # Añadir información del clima
        c.setFont("Helvetica", 12)
        y_position = 720
        for line in clima_info.split('\n'):
            c.drawString(100, y_position, line)
            y_position -= 15  # Espacio entre líneas

        # Si hay peligro, añadir hospitales y refugios
        if alert_level != "Sin peligro":
            y_position -= 15  # Espacio adicional antes de los hospitales
            for line in hospitales_info.split('\n'):
                c.drawString(100, y_position, line)
                y_position -= 15  # Espacio entre líneas

            # Añadir refugios cercanos
            y_position -= 15  # Espacio adicional antes de los refugios
            for line in refugios_info.split('\n'):
                c.drawString(100, y_position, line)
                y_position -= 15  # Espacio entre líneas

        c.save()
        print("El informe se ha guardado en 'informe_huracan.pdf'.")
    else:
        print(f"Error al obtener información: {response.status_code}, {response.text}")
else:
    print("No se pudo determinar la ubicación actual.")
