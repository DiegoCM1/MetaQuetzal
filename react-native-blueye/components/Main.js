import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

// Configuración de íconos para Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const MapViewWeb = () => {
  const [userLocation, setUserLocation] = useState([20.659698, -103.349609]); // Ubicación inicial (Guadalajara, México)
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [weatherLayers, setWeatherLayers] = useState({
    temperature: false,
    precipitation: true, // Activado por defecto
    humidity: false,
    wind: false,
    pressure: false,
    hurricaneRadar: false, // Nueva capa de radar de huracanes
  });
  const [forecastVisible, setForecastVisible] = useState(false);
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState("+52 55 1234 5678"); // Número inicial por defecto

  const weatherTileURLs = {
    temperature:
      "https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486",
    precipitation:
      "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486",
    humidity:
      "https://tile.openweathermap.org/map/humidity_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486",
    wind: "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486",
    pressure:
      "https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486",
    hurricaneRadar:
      "https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=73d3f6f15ce8ce7055f93bb64dde8486", // Usando la capa de viento para huracanes
  };

  const HurricaneMap = () => {
    return (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <iframe
          title="Hurricane Map"
          src="https://www.rainviewer.com/map.html?loc=20.5147,-99.9146,5&oCS=1&c=3&o=83&lm=1&layer=sat-rad&sm=1&sn=1"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            zIndex: 10,
          }}
          allowFullScreen
        ></iframe>
      </div>
    );
  };

  const obtenerClima = async (lat, lon) => {
    const API_KEY = "73d3f6f15ce8ce7055f93bb64dde8486";
    const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    try {
      console.log(`Obteniendo clima para lat: ${lat}, lon: ${lon}`);
      const response = await axios.get(BASE_URL, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: "metric",
          lang: "es",
        },
      });
      console.log("Datos del clima obtenidos:", response.data);
      setWeatherData(response.data);
      obtenerPronostico(lat, lon);
    } catch (error) {
      console.error("Error al obtener los datos del clima:", error);
      setError(
        "Error al obtener los datos del clima. Verifique su conexión a internet o la clave API."
      );
    }
  };

  const obtenerPronostico = async (lat, lon) => {
    const API_KEY = "73d3f6f15ce8ce7055f93bb64dde8486";
    const BASE_URL = "https://api.openweathermap.org/data/2.5/forecast";

    try {
      console.log(`Obteniendo pronóstico para lat: ${lat}, lon: ${lon}`);
      const response = await axios.get(BASE_URL, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: "metric",
          lang: "es",
        },
      });
      console.log("Datos del pronóstico obtenidos:", response.data);
      setForecastData(response.data);
    } catch (error) {
      console.error(
        "Error al obtener los datos del pronóstico del tiempo:",
        error
      );
      setError(
        "Error al obtener los datos del pronóstico del tiempo. Verifique su conexión a internet o la clave API."
      );
    }
  };

  const buscarUbicacion = async () => {
    if (!searchQuery) {
      alert("Por favor, ingrese una ubicación para buscar.");
      return;
    }
    const API_URL = "https://nominatim.openstreetmap.org/search";
    setLoading(true);
    try {
      console.log(`Buscando ubicación para: ${searchQuery}`);
      const response = await axios.get(API_URL, {
        params: {
          q: searchQuery,
          format: "json",
        },
      });
      if (response.data.length > 0) {
        const { lat, lon } = response.data[0];
        console.log(`Ubicación encontrada: lat ${lat}, lon ${lon}`);
        setSelectedLocation([parseFloat(lat), parseFloat(lon)]);
        setUserLocation([parseFloat(lat), parseFloat(lon)]);
        obtenerClima(lat, lon);
      } else {
        alert("Ubicación no encontrada.");
      }
    } catch (error) {
      console.error("Error al buscar la ubicación:", error);
      alert("Error al buscar la ubicación. Verifique su conexión a internet.");
    }
  };

  // Ícono personalizado para "Dónde estoy"
  const locationIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/854/854878.png", // URL del ícono del marcador
    iconSize: [30, 30], // Tamaño del ícono
    iconAnchor: [15, 30], // Anclaje del ícono
    popupAnchor: [0, -30], // Anclaje del popup
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(
            `Ubicación del usuario: lat ${latitude}, lon ${longitude}`
          );
          setUserLocation([latitude, longitude]);
          obtenerClima(latitude, longitude);
        },
        (err) => {
          console.error("Error al obtener la ubicación del usuario:", err);
          setError("No se pudo obtener la ubicación: " + err.message);
        },
        { enableHighAccuracy: true }
      );

      // Cleanup para detener la actualización de geolocalización al desmontar el componente
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setError("La geolocalización no es compatible con este navegador.");
    }
  }, []);

  const handleLayerToggle = (layer) => {
    console.log(`Cambiando estado de la capa: ${layer}`);
    setWeatherLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const toggleForecastVisibility = () => {
    setForecastVisible(!forecastVisible);
  };

  const toggleWeatherVisibility = () => {
    setWeatherVisible(!weatherVisible);
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        const { lat, lng } = e.latlng;
        console.log(`Mapa clicado en lat: ${lat}, lon: ${lng}`);
        setSelectedLocation([lat, lng]);
        obtenerClima(lat, lng);
      },
    });
    return null;
  };

  return (
    <div className="app-container">
      {/* Estilos */}
      <style>{`
        body, html {
          margin: 0;
          padding: 0;
          font-family: 'Roboto', sans-serif;
          background-color: #f4f7f9;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
        }

        .search-bar {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          display: flex;
          gap: 10px;
        }

        .search-bar input {
          padding: 10px;
          border: 2px solid #0077b6;
          border-radius: 6px;
          width: 300px;
          outline: none;
          font-size: 14px;
        }

        .search-bar button {
          padding: 10px 20px;
          border: none;
          background-color: #0077b6;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .controls {
          position: absolute;
          top: 70px;
          right: 15px;
          background: white;
          padding: 15px;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          z-index: 1000;
        }

        .controls h4 {
          margin: 0 0 10px;
          color: #0077b6;
          font-weight: bold;
        }

        .controls label {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          color: #333;
        }

        .controls input {
          margin-right: 10px;
        }

        .map-container {
          flex: 1;
          width: 100%;
          height: 100%;
          min-height: 400px;
        }

        .weather-data {
          padding: 15px;
          background-color: white;
          border-top: 2px solid #0077b6;
          overflow-y: auto;
          color: #333;
          font-size: 14px;
        }

        .weather-data h3 {
          color: #0077b6;
          margin: 0 0 15px;
          font-weight: bold;
        }

        .weather-toggle {
          padding: 10px;
          background-color: #0077b6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .weather-data table {
          width: 100%;
          border-collapse: collapse;
        }

        .weather-data table th {
          background-color: #0077b6;
          color: white;
          padding: 10px;
        }

        .weather-data table td {
          padding: 10px;
          border: 1px solid #ddd;
        }

        .forecast-container {
          padding: 15px;
          background-color: #ffffff;
          border-top: 2px solid #0077b6;
          margin-top: 15px;
        }

        .forecast-container h3 {
          color: #0077b6;
          margin: 0 0 15px;
          font-weight: bold;
        }

        .forecast-toggle {
          padding: 10px;
          background-color: #0077b6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 10px;
        }

        .forecast-table {
          max-height: 200px;
          overflow-y: auto;
        }

        .forecast-table table {
          width: 100%;
          border-collapse: collapse;
        }

        .forecast-table th, .forecast-table td {
          padding: 5px;
          border: 1px solid #ddd;
          text-align: center;
        }

        .forecast-table th {
          background-color: #005f86;
          color: white;
        }

        .forecast-table td {
          background-color: #ffffff;
          color: #333;
        }
         .contact-container {
          position: absolute;
          top: 100px;
          left: 15px;
          z-index: 1100;
          background: white;
          padding: 10px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          max-width: 200px;
        }

        .contact-container h4 {
          margin: 0 0 10px;
          color: #0077b6;
          font-weight: bold;
        }

        .contact-item {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
        }

        .contact-item img {
          width: 16px;
          height: 16px;
          margin-right: 5px;
        }

        .contact-item a {
          color: #333;
          text-decoration: none;
          font-size: 12px;
        }
      `}</style>

      {/* Barra de búsqueda */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar una ubicación..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={buscarUbicacion} disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>
      {/* Controles de capas */}
      <div className="controls">
        <h4>Capas Climáticas</h4>
        {Object.keys(weatherTileURLs).map((layer) => (
          <label key={layer}>
            <input
              type="checkbox"
              checked={weatherLayers[layer]}
              onChange={() => handleLayerToggle(layer)}
              disabled={layer === "precipitation"} // La precipitación siempre activa
            />
            {layer.charAt(0).toUpperCase() + layer.slice(1)}
          </label>
        ))}
      </div>
      <div className="contact-container">
        <h4>Contactos</h4>
        <div className="contact-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/15/15971.png"
            alt="Teléfono"
          />
          <a href="tel:+525512345678">+52 55 1234 5678</a>
        </div>
        <div className="contact-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/732/732200.png"
            alt="Correo"
          />
          <a href="mailto:info@example.com">info@example.com</a>
        </div>
      </div>

      <div className="contact-container">
        <h4>Contactos de Emergencia</h4>
        <div className="contact-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/15/15971.png"
            alt="Teléfono"
          />
          <a href={`tel:${emergencyContact}`}>{emergencyContact}</a>
        </div>
        <div className="contact-item">
          <img
            src="https://cdn-icons-png.flaticon.com/512/732/732200.png"
            alt="Correo"
          />
          <a href="mailto:info@example.com">info@example.com</a>
        </div>
      </div>

      {/* Mapa */}
      <MapContainer center={userLocation} zoom={5} className="map-container">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {Object.keys(weatherLayers).map(
          (layer) =>
            (weatherLayers[layer] || layer === "precipitation") && (
              <TileLayer
                key={layer}
                url={weatherTileURLs[layer]}
                opacity={0.6}
              />
            )
        )}

        <MapClickHandler />
        {selectedLocation && (
          <Marker position={selectedLocation}>
            <Popup>
              <h4 className="text-lg font-bold text-blue-500">
                Ubicación Seleccionada
              </h4>
              {weatherData ? (
                <>
                  <p className="text-sm text-gray-600">
                    Clima: {weatherData.weather[0].description}
                  </p>
                  <p className="text-sm text-gray-600">
                    Temp: {weatherData.main.temp}°C
                  </p>
                  <p className="text-sm text-gray-600">
                    Humedad: {weatherData.main.humidity}%
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">Obteniendo clima...</p>
              )}
            </Popup>
          </Marker>
        )}
        {/* Marcador de ubicación actual */}
        <Marker position={userLocation} icon={locationIcon}>
          <Popup>
            <h4 className="text-lg font-bold text-blue-500">Estás aquí</h4>
            <p className="text-sm text-gray-600">Lat: {userLocation[0]}</p>
            <p className="text-sm text-gray-600">Lon: {userLocation[1]}</p>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Datos climáticos */}
      <button className="weather-toggle" onClick={toggleWeatherVisibility}>
        {weatherVisible ? "Ocultar Datos del Clima" : "Mostrar Datos del Clima"}
      </button>

      {weatherVisible && weatherData && (
        <div className="weather-data">
          <h3>Datos del Clima</h3>
          <table>
            <thead>
              <tr>
                <th>Ubicación</th>
                <th>Clima</th>
                <th>Temp (°C)</th>
                <th>Humedad (%)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{weatherData.name || "Seleccionada"}</td>
                <td>{weatherData.weather[0].description}</td>
                <td>{weatherData.main.temp}</td>
                <td>{weatherData.main.humidity}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pronóstico del clima */}
      <button className="forecast-toggle" onClick={toggleForecastVisibility}>
        {forecastVisible ? "Ocultar Pronóstico" : "Mostrar Pronóstico"}
      </button>

      {forecastVisible && forecastData && (
        <div className="forecast-container forecast-table">
          <h3>Pronóstico del Tiempo</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Clima</th>
                <th>Temp (°C)</th>
                <th>Humedad (%)</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.list.slice(0, 10).map((item, index) => (
                <tr key={index}>
                  <td>{item.dt_txt}</td>
                  <td>{item.weather[0].description}</td>
                  <td>{item.main.temp}</td>
                  <td>{item.main.humidity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MapViewWeb;
