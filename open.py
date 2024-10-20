import requests
import geocoder

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
    else:
        print(f"Error al obtener información: {response.status_code}, {response.text}")
else:
    print("No se pudo determinar la ubicación actual.")
