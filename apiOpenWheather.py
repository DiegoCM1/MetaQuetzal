import requests
import geocoder
from geopy.distance import geodesic

# Obtén la ubicación actual del usuario
g = geocoder.ip('me')  # Utiliza la dirección IP del dispositivo para obtener la ubicación

if g.ok:
    # Coordenadas de la ubicación actual
    lat = g.latlng[0]
    lon = g.latlng[1]

    # Define tu clave API
    API_KEY = '73d3f6f15ce8ce7055f93bb64dde8486'  # Asegúrate de que esta clave sea correcta

    # URL de la API de OpenWeatherMap (Clima Actual)
    BASE_URL = 'https://api.openweathermap.org/data/2.5/weather'

    # Parámetros para obtener datos meteorológicos
    params = {
        'lat': lat,
        'lon': lon,
        'appid': API_KEY,
        'units': 'metric',  # Usar unidades métricas
        'lang': 'es'  # Idioma en español
    }

    # Realiza la solicitud a la API para obtener datos
    response = requests.get(BASE_URL, params=params)

    # Verifica si la solicitud fue exitosa
    if response.status_code == 200:
        data = response.json()

        # Muestra la ubicación actual
        print(f"Estás en: {g.city}, {g.state}, {g.country}")  # Muestra la ciudad, estado y país
        print(f"Coordenadas: {lat}, {lon}")

        # Muestra datos del clima actual
        print("Datos del clima actual:")
        print(f"Temperatura: {data['main']['temp']}°C")
        print(f"Descripción: {data['weather'][0]['description']}")
        print(f"Presión: {data['main']['pressure']} hPa")
        print(f"Humedad: {data['main']['humidity']}%")
        print(f"Velocidad del viento: {data['wind']['speed']} m/s")

        # Datos del huracán (ejemplo)
        hurricane_location = (20.0, -75.0)  # Coordenadas del huracán (ejemplo)
        hurricane_speed_kmh = 30  # Velocidad del huracán en km/h (ejemplo)

        # Calcular la distancia desde tu ubicación
        user_location = (lat, lon)
        distance_km = geodesic(hurricane_location, user_location).kilometers
        
        # Establecer un umbral de distancia
        threshold_distance_km = 500  # Ajusta este valor según sea necesario

        if distance_km < threshold_distance_km:
            # Calcular el tiempo en horas
            time_hours = distance_km / hurricane_speed_kmh
            time_days = time_hours / 24  # Convertir a días
            
            print(f"El huracán está a {distance_km:.2f} km de tu ubicación.")
            print(f"Se espera que llegue en aproximadamente {time_days:.2f} días.")
        else:
            print(f"El huracán está a {distance_km:.2f} km de tu ubicación, por lo que no se espera que pase cerca de ti.")
    else:
        print(f"Error al obtener información: {response.status_code}, {response.text}")
else:
    print("No se pudo determinar la ubicación actual.")
