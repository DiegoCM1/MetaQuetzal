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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import riskService from "../services/riskService.js";

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
  const [riskData, setRiskData] = useState(null); // Nuevo: datos de riesgo del backend
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
  const [showRiskBanner, setShowRiskBanner] = useState(false); // Banner de riesgo

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

  // Función mejorada que obtiene clima Y análisis de riesgo
  const obtenerClimaYRiesgo = async (lat, lon) => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Obteniendo clima y análisis de riesgo para lat: ${lat}, lon: ${lon}`);
      
      // Obtener análisis de riesgo del backend (incluye datos meteorológicos)
      const riskAnalysis = await riskService.getRiskAnalysis(lat, lon);
      const formattedRiskData = riskService.formatRiskData(riskAnalysis);
      
      setRiskData(formattedRiskData);
      
      // Mostrar banner de riesgo si es necesario
      setShowRiskBanner(riskService.shouldShowAlert(formattedRiskData.riskLevel));
      
      // Para compatibilidad con el código existente, crear weatherData desde riskData
      const compatibleWeatherData = {
        name: formattedRiskData.location.name,
        sys: { country: formattedRiskData.location.country },
        main: {
          temp: formattedRiskData.weather.temperature,
          humidity: formattedRiskData.weather.humidity,
          pressure: formattedRiskData.weather.pressure
        },
        wind: {
          speed: formattedRiskData.weather.windSpeed
        },
        weather: [{
          main: formattedRiskData.weather.main,
          description: formattedRiskData.weather.description
        }],
        coord: {
          lat: formattedRiskData.location.lat,
          lon: formattedRiskData.location.lon
        }
      };
      
      setWeatherData(compatibleWeatherData);
      
      // Obtener pronóstico tradicional (mantener funcionalidad existente)
      await obtenerPronostico(lat, lon);
      
    } catch (error) {
      console.error("Error al obtener análisis de riesgo:", error);
      
      // Fallback: usar método original si el backend falla
      try {
        await obtenerClimaOriginal(lat, lon);
      } catch (fallbackError) {
        console.error("Error en fallback:", fallbackError);
        setError("Error al obtener datos meteorológicos. Verifique su conexión.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Método original como fallback
  const obtenerClimaOriginal = async (lat, lon) => {
    const API_KEY = "73d3f6f15ce8ce7055f93bb64dde8486";
    const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

    try {
      const response = await axios.get(BASE_URL, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: "metric",
          lang: "es",
        },
      });
      setWeatherData(response.data);
      obtenerPronostico(lat, lon);
    } catch (error) {
      throw error;
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
      console.error("Error al obtener el pronóstico:", error);
    }
  };

  // Función para buscar ubicación por nombre
  const buscarUbicacion = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    const API_KEY = "73d3f6f15ce8ce7055f93bb64dde8486";

    try {
      const response = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct`,
        {
          params: {
            q: searchQuery,
            limit: 1,
            appid: API_KEY,
          },
        }
      );

      if (response.data.length > 0) {
        const location = response.data[0];
        const newLocation = [location.lat, location.lon];
        setUserLocation(newLocation);
        setSelectedLocation(newLocation);
        await obtenerClimaYRiesgo(location.lat, location.lon);
      } else {
        setError("Ubicación no encontrada");
      }
    } catch (error) {
      console.error("Error al buscar ubicación:", error);
      setError("Error al buscar la ubicación");
    } finally {
      setLoading(false);
    }
  };

  // Componente del mapa con eventos
  const MapEvents = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setSelectedLocation([lat, lng]);
        await obtenerClimaYRiesgo(lat, lng);
      },
    });
    return null;
  };

  // Efecto para cargar datos iniciales
  useEffect(() => {
    obtenerClimaYRiesgo(userLocation[0], userLocation[1]);
  }, []);

  // ...existing code continues (rest of the component remains the same)
  
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Banner de Riesgo - NUEVO */}
      {showRiskBanner && riskData && (
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: riskData.banner.color,
            color: 'white',
            padding: '12px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            zIndex: 1001,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          {riskData.banner.text} - {riskData.banner.description}
          <button 
            onClick={() => setShowRiskBanner(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              marginLeft: '10px',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Barra de herramientas superior */}
      <div
        style={{
          position: "absolute",
          top: showRiskBanner ? 60 : 10,
          left: 10,
          right: 10,
          zIndex: 1000,
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Búsqueda */}
        <div style={{ display: "flex", gap: "5px" }}>
          <input
            type="text"
            placeholder="Buscar ubicación..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && buscarUbicacion()}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "14px",
              minWidth: "200px",
            }}
          />
          <button
            onClick={buscarUbicacion}
            disabled={loading}
            style={{
              padding: "8px 12px",
              backgroundColor: loading ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "🔄" : "🔍"}
          </button>
        </div>

        {/* Información de riesgo - NUEVO */}
        {riskData && (
          <div
            style={{
              backgroundColor: "white",
              padding: "8px 12px",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <span>{riskService.getRiskIcon(riskData.riskLevel)}</span>
            <span>
              Riesgo: <strong style={{ color: riskService.getBannerColor(riskData.riskLevel) }}>
                {riskData.riskLevel.toUpperCase()}
              </strong> ({riskData.riskScore}/100)
            </span>
          </div>
        )}

        {/* Controles de capas meteorológicas */}
        <div
          style={{
            backgroundColor: "white",
            padding: "8px",
            borderRadius: "6px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {Object.entries(weatherLayers).map(([layer, active]) => (
            <label key={layer} style={{ fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={active}
                onChange={(e) =>
                  setWeatherLayers((prev) => ({
                    ...prev,
                    [layer]: e.target.checked,
                  }))
                }
                style={{ marginRight: "4px" }}
              />
              {layer.charAt(0).toUpperCase() + layer.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {/* Información del clima */}
      {weatherData && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            backgroundColor: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            minWidth: "300px",
            zIndex: 1000,
          }}
        >
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold" }}>
            {weatherData.name}, {weatherData.sys?.country}
          </h3>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
            <div>🌡️ Temperatura: {Math.round(weatherData.main.temp)}°C</div>
            <div>💧 Humedad: {weatherData.main.humidity}%</div>
            <div>💨 Viento: {weatherData.wind?.speed || 0} m/s</div>
            <div>📊 Presión: {weatherData.main.pressure} hPa</div>
          </div>
          
          <div style={{ marginTop: "8px", fontSize: "14px" }}>
            ☁️ {weatherData.weather[0].description}
          </div>

          {/* Información de riesgo adicional */}
          {riskData && riskData.riskFactors.length > 0 && (
            <div style={{ 
              marginTop: "12px", 
              padding: "8px", 
              backgroundColor: "#fff3cd", 
              borderRadius: "4px",
              borderLeft: "4px solid #ffc107"
            }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px" }}>
                ⚠️ Factores de Riesgo:
              </div>
              {riskData.riskFactors.slice(0, 3).map((factor, index) => (
                <div key={index} style={{ fontSize: "11px", marginBottom: "2px" }}>
                  • {factor}
                </div>
              ))}
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button
              onClick={() => setForecastVisible(!forecastVisible)}
              style={{
                padding: "6px 12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              📊 Pronóstico
            </button>
            
            {riskData && (
              <button
                onClick={() => window.open('/risk-analysis', '_blank')}
                style={{
                  padding: "6px 12px",
                  backgroundColor: riskService.getBannerColor(riskData.riskLevel),
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                🔍 Análisis Completo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mapa */}
      <MapContainer
        center={userLocation}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Capas meteorológicas */}
        {Object.entries(weatherLayers).map(
          ([layer, active]) =>
            active && (
              <TileLayer
                key={layer}
                url={weatherTileURLs[layer]}
                opacity={0.6}
              />
            )
        )}

        {/* Marcador de ubicación */}
        {selectedLocation && (
          <Marker position={selectedLocation}>
            <Popup>
              <div>
                <strong>Ubicación seleccionada</strong>
                <br />
                Lat: {selectedLocation[0].toFixed(4)}
                <br />
                Lon: {selectedLocation[1].toFixed(4)}
                {riskData && (
                  <>
                    <br />
                    <br />
                    <strong>Análisis de Riesgo:</strong>
                    <br />
                    {riskData.banner.text}
                    <br />
                    Score: {riskData.riskScore}/100
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        <MapEvents />
      </MapContainer>

      {/* Error display */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "rgba(220, 53, 69, 0.9)",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            zIndex: 1001,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "10px",
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default MapViewWeb;
