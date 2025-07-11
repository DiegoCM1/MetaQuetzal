import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import riskService from '../services/riskService.js';

const RiskAnalysisDemo = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Coordenadas de ejemplo
  const testLocations = [
    { name: 'Guadalajara, MX', lat: 20.659698, lon: -103.349609 },
    { name: 'Miami, FL', lat: 25.7617, lon: -80.1918 },
    { name: 'London, UK', lat: 51.5074, lon: -0.1278 },
    { name: 'Tokyo, JP', lat: 35.6762, lon: 139.6503 }
  ];

  // Verificar salud del backend al cargar
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const health = await riskService.checkHealth();
      setBackendHealth(health);
      console.log('Backend health:', health);
    } catch (error) {
      console.error('Backend health check failed:', error);
      setBackendHealth({ status: 'ERROR', message: error.message });
    }
  };

  const analyzeRisk = async (location) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Analizando riesgo para ${location.name}...`);
      
      const rawData = await riskService.getRiskAnalysis(location.lat, location.lon);
      const formattedData = riskService.formatRiskData(rawData);
      
      setRiskData(formattedData);
      
      // Mostrar alerta si hay riesgo
      if (riskService.shouldShowAlert(formattedData.riskLevel)) {
        Alert.alert(
          formattedData.alert.title,
          formattedData.alert.message,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error analyzing risk:', error);
      setError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level) => {
    const colors = {
      low: '#32CD32',
      medium: '#FFA500', 
      high: '#FF4500',
      extreme: '#8B0000'
    };
    return colors[level] || '#32CD32';
  };

  return (
    <ScrollView className="flex-1 bg-gray-100 p-4">
      <Text className="text-2xl font-bold text-center mb-4">
        🌊 BlueEye Risk Analysis Demo
      </Text>

      {/* Estado del Backend */}
      <View className="bg-white rounded-lg p-4 mb-4 shadow">
        <Text className="text-lg font-semibold mb-2">Estado del Backend:</Text>
        {backendHealth ? (
          <View className="flex-row items-center">
            <Text className={`text-sm ${backendHealth.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
              {backendHealth.status === 'OK' ? '✅ Conectado' : '❌ Error'}
            </Text>
            <Text className="text-xs text-gray-500 ml-2">
              {backendHealth.message}
            </Text>
          </View>
        ) : (
          <Text className="text-gray-500">Verificando...</Text>
        )}
        
        <TouchableOpacity 
          className="bg-blue-500 rounded px-3 py-1 mt-2 self-start"
          onPress={checkBackendHealth}
        >
          <Text className="text-white text-xs">Verificar</Text>
        </TouchableOpacity>
      </View>

      {/* Botones de prueba */}
      <View className="bg-white rounded-lg p-4 mb-4 shadow">
        <Text className="text-lg font-semibold mb-3">Probar Ubicaciones:</Text>
        {testLocations.map((location, index) => (
          <TouchableOpacity
            key={index}
            className="bg-blue-500 rounded-lg p-3 mb-2"
            onPress={() => analyzeRisk(location)}
            disabled={loading}
          >
            <Text className="text-white text-center font-medium">
              {loading ? 'Analizando...' : `Analizar ${location.name}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resultados del análisis */}
      {riskData && (
        <View className="bg-white rounded-lg p-4 shadow">
          <Text className="text-lg font-bold mb-3">
            📊 Análisis de Riesgo - {riskData.location.name}
          </Text>

          {/* Banner de riesgo */}
          <View 
            className="rounded-lg p-3 mb-3"
            style={{ backgroundColor: riskData.banner.backgroundColor }}
          >
            <Text 
              className="text-center font-bold"
              style={{ color: riskData.banner.color }}
            >
              {riskData.banner.text}
            </Text>
            <Text className="text-center text-sm mt-1">
              {riskData.banner.description}
            </Text>
          </View>

          {/* Puntuación de riesgo */}
          <View className="flex-row justify-between mb-3">
            <Text className="font-medium">Nivel de Riesgo:</Text>
            <Text 
              className="font-bold uppercase"
              style={{ color: getRiskLevelColor(riskData.riskLevel) }}
            >
              {riskData.riskLevel} ({riskData.riskScore}/100)
            </Text>
          </View>

          {/* Condiciones actuales */}
          <View className="border-t border-gray-200 pt-3 mb-3">
            <Text className="font-semibold mb-2">Condiciones Actuales:</Text>
            <Text>🌡️ Temperatura: {riskData.weather.temperature}°C</Text>
            <Text>💨 Viento: {riskData.weather.windSpeed} m/s</Text>
            <Text>💧 Humedad: {riskData.weather.humidity}%</Text>
            <Text>📊 Presión: {riskData.weather.pressure} hPa</Text>
            <Text>☁️ Condición: {riskData.weather.description}</Text>
          </View>

          {/* Factores de riesgo */}
          {riskData.riskFactors.length > 0 && (
            <View className="border-t border-gray-200 pt-3 mb-3">
              <Text className="font-semibold mb-2">Factores de Riesgo:</Text>
              {riskData.riskFactors.map((factor, index) => (
                <Text key={index} className="text-sm text-orange-600 mb-1">
                  • {factor}
                </Text>
              ))}
            </View>
          )}

          {/* Recomendaciones */}
          <View className="border-t border-gray-200 pt-3">
            <Text className="font-semibold mb-2">Recomendaciones:</Text>
            {riskData.recommendations.map((rec, index) => (
              <Text key={index} className="text-sm text-gray-700 mb-1">
                • {rec}
              </Text>
            ))}
          </View>

          {/* Timestamp */}
          <Text className="text-xs text-gray-400 mt-3 text-center">
            Actualizado: {riskData.lastUpdate.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View className="bg-red-100 border border-red-400 rounded-lg p-4 mt-4">
          <Text className="text-red-700 font-medium">Error:</Text>
          <Text className="text-red-600">{error}</Text>
        </View>
      )}
    </ScrollView>
  );
};

export default RiskAnalysisDemo;
