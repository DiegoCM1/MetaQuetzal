import requests
import geocoder
from geopy.distance import geodesic

# Función para buscar lugares cercanos usando Overpass API
def buscar_lugares_cercanos(lat, lon):
    # Consulta para hospitales y centros de acopio
    query = f"""
    [out:json];
    (
      node["amenity"="hospital"](around:5000, {lat}, {lon});
      node["emergency"="shelter"](around:5000, {lat}, {lon});
      way["amenity"="hospital"](around:5000, {lat}, {lon});
      way["emergency"="shelter"](around:5000, {lat}, {lon});
    );
    out body;
    """
    response = requests.get('http://overpass-api.de/api/interpreter', params={'data': query})
    return response.json()

# Obtén la ubicación actual del usuario
g = geocoder.ip('me')  # Utiliza la dirección IP del dispositivo para obtener la ubicación

if g.ok:
    # Coordenadas de la ubicación actual
    lat = g.latlng[0]
    lon = g.latlng[1]

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
        print(f"Estás en: {g.city}, {g.state}, {g.country}")
        print(f"Coordenadas: {lat}, {lon}")

        # Muestra datos del clima actual
        print("Datos del clima actual:")
        print(f"Temperatura: {data['main']['temp']}°C")
        print(f"Descripción: {data['weather'][0]['description']}")
        print(f"Presión: {data['main']['pressure']} hPa")
        print(f"Humedad: {data['main']['humidity']}%")
        print(f"Velocidad del viento: {data['wind']['speed']} m/s")

        # Datos del huracán (ejemplo)
        hurricane_location = (20.0, -75.0)  # Coordenadas del huracán
        hurricane_speed_kmh = 30  # Velocidad del huracán en km/h

        # Calcular la distancia desde la ubicación actual
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
        print(f"El huracán está a {distance_km:.2f} km de tu ubicación. Nivel de alerta: {alert_level}")

        if alert_level != "Sin peligro":
            # Calcular el tiempo en horas
            time_hours = distance_km / hurricane_speed_kmh
            time_days = time_hours / 24  # Convertir a días

            print(f"Se espera que llegue en aproximadamente {time_days:.2f} días.")

            # Buscar lugares cercanos
            lugares_cercanos = buscar_lugares_cercanos(lat, lon)

            if lugares_cercanos['elements']:
                print("Lugares cercanos que pueden ser útiles:")
                for lugar in lugares_cercanos['elements']:
                    if 'tags' in lugar:
                        nombre = lugar['tags'].get('name', 'Sin nombre')
                        tipo = lugar['tags'].get('amenity', lugar['tags'].get('emergency', 'Desconocido'))
                        print(f"- {nombre} ({tipo})")
            else:
                print("No se encontraron lugares cercanos útiles.")
        else:
            print("No se espera que el huracán pase cerca de ti.")
    else:
        print(f"Error al obtener información: {response.status_code}, {response.text}")
else:
    print("No se pudo determinar la ubicación actual.")

