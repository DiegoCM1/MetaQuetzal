import "../global.css";
import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Link } from "expo-router";
import riskService from "../services/riskService.js";

export default function RiskAnalysisScreen() {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({ lat: 20.659698, lon: -103.349609 });

  useEffect(() => {
    // Cargar análisis inicial
    analyzeCurrentLocation();
  }, []);

  const analyzeCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const rawData = await riskService.getRiskAnalysis(currentLocation.lat, currentLocation.lon);
      const formattedData = riskService.formatRiskData(rawData);
      setRiskData(formattedData);
      
      // Si hay riesgo alto, mostrar alerta automáticamente
      if (riskService.shouldShowAlert(formattedData.riskLevel)) {
        setTimeout(() => {
          Alert.alert(
            formattedData.alert.title,
            formattedData.alert.message + '\n\nAcciones recomendadas:\n' + 
            formattedData.alert.actions.map(action => `• ${action}`).join('\n'),
            [{ text: 'Entendido' }]
          );
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error analyzing risk:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600', 
      high: 'text-orange-600',
      extreme: 'text-red-600'
    };
    return colors[level] || 'text-green-600';
  };

  const getRiskBgColor = (level) => {
    const colors = {
      low: 'bg-green-100',
      medium: 'bg-yellow-100', 
      high: 'bg-orange-100',
      extreme: 'bg-red-100'
    };
    return colors[level] || 'bg-green-100';
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-6 px-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-2xl font-bold">
            🌊 Análisis de Riesgo
          </Text>
          <TouchableOpacity 
            onPress={analyzeCurrentLocation}
            className="bg-blue-500 rounded-lg px-3 py-2"
          >
            <Text className="text-white text-sm">
              {loading ? 'Actualizando...' : '🔄 Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 py-4">
        {/* Banner de riesgo principal */}
        {riskData && (
          <View 
            className={`rounded-xl p-4 mb-4 ${getRiskBgColor(riskData.riskLevel)}`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className={`text-xl font-bold ${getRiskColor(riskData.riskLevel)}`}>
                  {riskService.getRiskIcon(riskData.riskLevel)} {riskData.riskLevel.toUpperCase()}
                </Text>
                <Text className="text-gray-700 mt-1">
                  {riskData.banner.description}
                </Text>
                <Text className="text-sm text-gray-600 mt-1">
                  📍 {riskData.location.name}, {riskData.location.country}
                </Text>
              </View>
              <View className="items-center">
                <Text className={`text-3xl font-bold ${getRiskColor(riskData.riskLevel)}`}>
                  {riskData.riskScore}
                </Text>
                <Text className="text-xs text-gray-500">/ 100</Text>
              </View>
            </View>
          </View>
        )}

        {/* Condiciones meteorológicas actuales */}
        {riskData && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">🌤️ Condiciones Actuales</Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Temperatura</Text>
                <Text className="font-medium">{riskData.weather.temperature}°C</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Viento</Text>
                <Text className="font-medium">{riskData.weather.windSpeed} m/s</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Humedad</Text>
                <Text className="font-medium">{riskData.weather.humidity}%</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Presión</Text>
                <Text className="font-medium">{riskData.weather.pressure} hPa</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Condición</Text>
                <Text className="font-medium capitalize">{riskData.weather.description}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Factores de riesgo */}
        {riskData && riskData.riskFactors.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">⚠️ Factores de Riesgo Detectados</Text>
            {riskData.riskFactors.map((factor, index) => (
              <View key={index} className="flex-row items-start mb-2">
                <Text className="text-orange-500 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">{factor}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recomendaciones */}
        {riskData && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-semibold mb-3">💡 Recomendaciones</Text>
            {riskData.recommendations.map((rec, index) => (
              <View key={index} className="flex-row items-start mb-2">
                <Text className="text-blue-500 mr-2">•</Text>
                <Text className="text-gray-700 flex-1">{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Alerta activa */}
        {riskData && riskData.alert && (
          <View className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-4">
            <Text className="text-red-800 font-bold text-lg mb-2">
              {riskData.alert.title}
            </Text>
            <Text className="text-red-700 mb-3">
              {riskData.alert.message}
            </Text>
            <Text className="text-red-800 font-medium mb-2">Acciones recomendadas:</Text>
            {riskData.alert.actions.map((action, index) => (
              <Text key={index} className="text-red-700 text-sm mb-1">
                • {action}
              </Text>
            ))}
          </View>
        )}

        {/* Error */}
        {error && (
          <View className="bg-red-100 border border-red-400 rounded-xl p-4 mb-4">
            <Text className="text-red-800 font-bold mb-2">❌ Error</Text>
            <Text className="text-red-700">{error}</Text>
            <TouchableOpacity 
              onPress={analyzeCurrentLocation}
              className="bg-red-500 rounded-lg px-4 py-2 mt-3 self-start"
            >
              <Text className="text-white text-sm">Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View className="bg-blue-50 rounded-xl p-8 items-center">
            <Text className="text-blue-600 font-medium">
              🔄 Analizando condiciones meteorológicas...
            </Text>
          </View>
        )}

        {/* Footer info */}
        {riskData && (
          <View className="bg-gray-100 rounded-xl p-4 mt-4">
            <Text className="text-xs text-gray-500 text-center">
              Última actualización: {riskData.lastUpdate.toLocaleString()}
            </Text>
            <Text className="text-xs text-gray-500 text-center mt-1">
              Datos proporcionados por OpenWeatherMap
            </Text>
          </View>
        )}

        {/* Navegación */}
        <View className="flex-row justify-around mt-6 mb-4">
          <Link href="/" asChild>
            <TouchableOpacity className="bg-blue-600 rounded-xl px-6 py-3">
              <Text className="text-white font-medium">🏠 Inicio</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/alerts" asChild>
            <TouchableOpacity className="bg-orange-600 rounded-xl px-6 py-3">
              <Text className="text-white font-medium">🚨 Alertas</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
