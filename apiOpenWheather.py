import requests
from geopy.distance import geodesic

# Datos del huracán (ejemplo)
hurricane_location = (20.0, -75.0)  # Coordenadas del huracán (ejemplo)
hurricane_speed_kmh = 30  # Velocidad del huracán en km/h (ejemplo)

# Lista de ubicaciones
locations = [
    # Caribe
    {'name': 'La Habana', 'lat': 23.1136, 'lon': -82.3666},  # Cuba
    {'name': 'Santiago de Cuba', 'lat': 20.0240, 'lon': -75.8215},  # Cuba
    {'name': 'San Juan', 'lat': 18.4655, 'lon': -66.1057},   # Puerto Rico
    {'name': 'Cancún', 'lat': 21.1619, 'lon': -86.8515},     # México
    {'name': 'Punta Cana', 'lat': 18.5820, 'lon': -68.4055},  # República Dominicana
    {'name': 'Kingston', 'lat': 17.9714, 'lon': -76.7936},   # Jamaica
    
    # Costa Este de EE. UU.
    {'name': 'Miami', 'lat': 25.7617, 'lon': -80.1918},     # EE. UU.
    {'name': 'Tampa', 'lat': 27.9506, 'lon': -82.4572},     # EE. UU.
    {'name': 'Nueva Orleans', 'lat': 29.9511, 'lon': -90.0715},  # EE. UU.
    {'name': 'Charleston', 'lat': 32.7765, 'lon': -79.9309},  # EE. UU.
    {'name': 'Virginia Beach', 'lat': 36.8529, 'lon': -75.9770},  # EE. UU.
    
    # Golfo de México
    {'name': 'Mobile', 'lat': 30.6954, 'lon': -88.0399},    # EE. UU.
    {'name': 'Corpus Christi', 'lat': 27.8006, 'lon': -97.3963},  # EE. UU.
    
    # Asia y Oceanía
    {'name': 'Bangkok', 'lat': 13.7563, 'lon': 100.5018},    # Tailandia
    {'name': 'Manila', 'lat': 14.5995, 'lon': 120.9842},     # Filipinas
    {'name': 'Sídney', 'lat': -33.8688, 'lon': 151.2093},    # Australia
    {'name': 'Nukuʻalofa', 'lat': -21.1344, 'lon': -175.2016},  # Tonga
    {'name': 'Apia', 'lat': -13.8333, 'lon': -171.75},        # Samoa
]

# Calcular la distancia y el tiempo de llegada
for location in locations:
    city_location = (location['lat'], location['lon'])
    distance_km = geodesic(hurricane_location, city_location).kilometers
    
    # Calcular el tiempo en horas
    time_hours = distance_km / hurricane_speed_kmh
    time_days = time_hours / 24  # Convertir a días
    
    print(f"{location['name']} está a {distance_km:.2f} km del huracán.")
    print(f"Se espera que llegue en aproximadamente {time_days:.2f} días.")
