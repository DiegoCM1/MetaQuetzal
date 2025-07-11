import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import riskService from '../services/riskService.js';

const SystemTestScreen = () => {
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);

  const runTests = async () => {
    setRunning(true);
    const testResults = [];

    // Test 1: Verificar conectividad con backend
    try {
      const health = await riskService.checkHealth();
      testResults.push({
        name: '🖥️ Conectividad Backend',
        status: 'SUCCESS',
        details: `Estado: ${health.status}`,
        color: 'text-green-600'
      });
    } catch (error) {
      testResults.push({
        name: '🖥️ Conectividad Backend', 
        status: 'FAILED',
        details: error.message,
        color: 'text-red-600'
      });
    }

    // Test 2: Probar análisis de riesgo
    try {
      const riskData = await riskService.getRiskAnalysis(20.659698, -103.349609);
      const formatted = riskService.formatRiskData(riskData);
      testResults.push({
        name: '📊 Análisis de Riesgo',
        status: 'SUCCESS', 
        details: `Ubicación: ${formatted.location.name}, Riesgo: ${formatted.riskLevel}`,
        color: 'text-green-600'
      });
    } catch (error) {
      testResults.push({
        name: '📊 Análisis de Riesgo',
        status: 'FAILED',
        details: error.message,
        color: 'text-red-600'
      });
    }

    // Test 3: Verificar servicios
    try {
      const testLevel = 'medium';
      const shouldAlert = riskService.shouldShowAlert(testLevel);
      const color = riskService.getBannerColor(testLevel);
      const icon = riskService.getRiskIcon(testLevel);
      
      testResults.push({
        name: '🔧 Funciones del Servicio',
        status: 'SUCCESS',
        details: `Alertas: ${shouldAlert}, Color: ${color}, Icono: ${icon}`,
        color: 'text-green-600'
      });
    } catch (error) {
      testResults.push({
        name: '🔧 Funciones del Servicio',
        status: 'FAILED', 
        details: error.message,
        color: 'text-red-600'
      });
    }

    setTests(testResults);
    setRunning(false);

    // Mostrar resumen
    const successCount = testResults.filter(t => t.status === 'SUCCESS').length;
    const totalTests = testResults.length;
    
    Alert.alert(
      'Pruebas Completadas',
      `${successCount}/${totalTests} pruebas exitosas`,
      [{ text: 'OK' }]
    );
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
      <View className="bg-blue-600 rounded-xl p-4 mb-4">
        <Text className="text-white text-xl font-bold text-center">
          🧪 Pruebas del Sistema BlueEye
        </Text>
        <Text className="text-blue-100 text-center mt-1">
          Verificación de integración Backend-Frontend
        </Text>
      </View>

      <TouchableOpacity 
        onPress={runTests}
        disabled={running}
        className={`rounded-lg p-4 mb-4 ${running ? 'bg-gray-400' : 'bg-green-600'}`}
      >
        <Text className="text-white text-center font-bold">
          {running ? '🔄 Ejecutando Pruebas...' : '▶️ Ejecutar Pruebas'}
        </Text>
      </TouchableOpacity>

      <View className="bg-white rounded-xl p-4">
        <Text className="text-lg font-bold mb-4">📋 Resultados de Pruebas:</Text>
        
        {tests.length === 0 ? (
          <Text className="text-gray-500 text-center">
            Presiona "Ejecutar Pruebas" para comenzar
          </Text>
        ) : (
          tests.map((test, index) => (
            <View key={index} className="border-b border-gray-200 pb-3 mb-3 last:border-b-0">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="font-medium">{test.name}</Text>
                <Text className={`font-bold ${test.color}`}>
                  {test.status === 'SUCCESS' ? '✅ ÉXITO' : '❌ FALLO'}
                </Text>
              </View>
              <Text className="text-sm text-gray-600">{test.details}</Text>
            </View>
          ))
        )}
      </View>

      {tests.length > 0 && (
        <View className="bg-blue-50 rounded-xl p-4 mt-4">
          <Text className="text-blue-800 font-bold mb-2">🎯 Siguiente Paso:</Text>
          <Text className="text-blue-700 text-sm">
            Si todas las pruebas son exitosas, navega a /risk-analysis o /alarmScreensReal para ver las nuevas funcionalidades en acción.
          </Text>
        </View>
      )}

      <View className="bg-gray-100 rounded-xl p-4 mt-4">
        <Text className="text-gray-600 text-sm text-center">
          Sistema de verificación BlueEye v2.0
        </Text>
      </View>
    </ScrollView>
  );
};

export default SystemTestScreen;
