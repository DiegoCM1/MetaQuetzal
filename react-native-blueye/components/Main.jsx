import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
/*import MapView, { Marker } from "react-native-maps";
import axios from "axios";
*/
export default function Home() {
  /*const [location, setLocation] = useState({
    latitude: 20.659698, // Coordenadas iniciales (México)
    longitude: -103.349609,
  });
  const [weatherData, setWeatherData] = useState(null); // Datos del clima

  // Función para obtener datos de OpenWeather
  const fetchWeather = async (lat, lon) => {
    const apiKey = "580c01772ed0b2bddf55452992385739"; // Reemplaza con tu API Key
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
      const response = await axios.get(url);
      setWeatherData(response.data);
    } catch (error) {
      console.error("Error fetching weather data:", error);
    }
  };

  useEffect(() => {
    // Obtener datos climáticos para la ubicación inicial
    fetchWeather(location.latitude, location.longitude);
  }, []);
*/
  return (
    /*<View className="flex-1 h-full bg-black">
      {/* Datos del clima }
      {weatherData && (
        <View className="bg-gray-100 mt-12 p-4">
          <Text className="text-lg font-bold text-gray-800">
            Clima en {weatherData.name}
          </Text>
          <Text className="text-gray-700">
            Temperatura: {weatherData.main.temp}°C
          </Text>
          <Text className="text-gray-700">
            Condición: {weatherData.weather[0].description}
          </Text>
        </View>
      )}
      {/* Mapa }
      <MapView
        style={{ flex: 1 }} // Asegúrate de que el estilo cubra toda la pantalla
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        region={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {/* Marcador }
        <Marker coordinate={location} title="Ubicación seleccionada" />
      </MapView>
      */
    <View className="flex-1 h-full bg-black">
    </View>
  );
}
