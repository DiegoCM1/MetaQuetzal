import "../global.css";
import { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import HurricaneCategory1 from "../components/hurricane-category-1";
import HurricaneCategory2 from "../components/hurricane-category-2";
import HurricaneCategory3 from "../components/hurricane-category-3";
import HurricaneCategory4 from "../components/hurricane-category-4";
import HurricaneCategory5 from "../components/hurricane-category-5";
import riskService from "../services/riskService.js";

export default function AlarmsScreen() {
  const [category, setCategory] = useState(1); // Categoría actual
  const [isAlertActive, setIsAlertActive] = useState(false); // Controla si se muestra la alarma
  const [riskData, setRiskData] = useState(null); // Datos reales del backend
  const [currentLocation, setCurrentLocation] = useState({ 
    lat: 20.659698, 
    lon: -103.349609 
  }); // Ubicación actual (Guadalajara por defecto)
  const [loading, setLoading] = useState(false);

  // Función para detectar riesgos meteorológicos reales
  const detectRealWeatherRisk = async () => {
    try {
      setLoading(true);
      
      // Obtener análisis de riesgo real del backend
      const rawData = await riskService.getRiskAnalysis(currentLocation.lat, currentLocation.lon);
      const formattedData = riskService.formatRiskData(rawData);
      
      setRiskData(formattedData);
      
      // Convertir nivel de riesgo a categoría de huracán para compatibilidad
      const riskToCategory = {
        'low': 1,
        'medium': 2,
        'high': 4,
        'extreme': 5
      };
      
      const riskCategory = riskToCategory[formattedData.riskLevel] || 1;
      setCategory(riskCategory);
      
      // Mostrar alerta solo si hay riesgo significativo
      if (riskService.shouldShowAlert(formattedData.riskLevel)) {
        setIsAlertActive(true);
      } else {
        setIsAlertActive(false);
      }
      
    } catch (error) {
      console.error('Error detecting weather risk:', error);
      // En caso de error, usar valores por defecto seguros
      setCategory(1);
      setIsAlertActive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verificar riesgo inmediatamente al cargar
    detectRealWeatherRisk();
    
    // Verificar cada 30 segundos (en lugar de 3 para no sobrecargar la API)
    const interval = setInterval(detectRealWeatherRisk, 30000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  // Función para determinar el estilo basado en datos reales
  const getCategoryStyle = () => {
    if (!riskData) {
      // Valores por defecto mientras carga
      return {
        bgStyle: "bg-phase1bg",
        buttonStyle: "bg-phase1Cards",
        text: "🔄\nAnalizando Condiciones\nCargando...",
        instructions: "Obteniendo datos meteorológicos en tiempo real...",
        details: "Conectando con servidor..."
      };
    }

    // Mapear nivel de riesgo real a categorías visuales existentes
    const riskLevelMapping = {
      low: {
        bgStyle: "bg-phase1bg",
        buttonStyle: "bg-phase1Cards",
        text: `✅\n${riskData.location.name}\nCondiciones Normales`,
        instructions: riskData.recommendations.join('\n• '),
        details: `Última actualización: ${riskData.lastUpdate.toLocaleString()}\nRiesgo: ${riskData.riskScore}/100`
      },
      medium: {
        bgStyle: "bg-phase2bg", 
        buttonStyle: "bg-phase2Buttons",
        text: `⚡\n${riskData.location.name}\nPrecaución Requerida`,
        instructions: riskData.recommendations.join('\n• '),
        details: `Factores detectados:\n${riskData.riskFactors.join('\n')}\n\nRiesgo: ${riskData.riskScore}/100`
      },
      high: {
        bgStyle: "bg-phase4bg",
        buttonStyle: "bg-phase4Cards", 
        text: `⚠️\n${riskData.location.name}\nCondiciones Peligrosas`,
        instructions: riskData.alert ? riskData.alert.actions.join('\n• ') : riskData.recommendations.join('\n• '),
        details: `ALERTA ACTIVA:\n${riskData.alert?.message || 'Condiciones meteorológicas adversas'}\n\nFactores: ${riskData.riskFactors.join(', ')}\nRiesgo: ${riskData.riskScore}/100`
      },
      extreme: {
        bgStyle: "bg-phase5bg",
        buttonStyle: "bg-phase5Cards",
        text: `🚨\n${riskData.location.name}\nPELIGRO EXTREMO`,
        instructions: riskData.alert ? riskData.alert.actions.join('\n• ') : 'EVACUE INMEDIATAMENTE SI ES POSIBLE',
        details: `EMERGENCIA METEOROLÓGICA:\n${riskData.alert?.message || 'Condiciones extremadamente peligrosas'}\n\nFactores críticos: ${riskData.riskFactors.join(', ')}\nRiesgo: ${riskData.riskScore}/100`
      }
    };

    return riskLevelMapping[riskData.riskLevel] || riskLevelMapping.low;
  };

  // Renderiza el componente basado en la categoría
  const renderCategory = () => {
    switch (category) {
      case 1:
        return <HurricaneCategory1 />;
      case 2:
        return <HurricaneCategory2 />;
      case 3:
        return <HurricaneCategory3 />;
      case 4:
        return <HurricaneCategory4 />;
      case 5:
        return <HurricaneCategory5 />;
      default:
        return <HurricaneCategory1 />;
    }
  };

  const categoryStyle = getCategoryStyle();

  return (
    <View className="flex-1">
      {/* Pantalla de fondo siempre visible */}
      <View className={`flex-1 justify-center items-center p-6 ${categoryStyle.bgStyle}`}>
        {renderCategory()}
        
        {/* Indicador de estado de conexión */}
        <View className="absolute top-12 right-4">
          <View className={`px-3 py-1 rounded-full ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}>
            <Text className="text-white text-xs font-medium">
              {loading ? '🔄 Actualizando' : '🌐 Conectado'}
            </Text>
          </View>
        </View>

        {/* Información de ubicación */}
        {riskData && (
          <View className="absolute bottom-20 left-4 right-4">
            <View className="bg-white/90 rounded-lg p-3">
              <Text className="text-sm font-medium text-gray-800">
                📍 {riskData.location.name}, {riskData.location.country}
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                🌡️ {riskData.weather.temperature}°C • 💨 {riskData.weather.windSpeed} m/s • 💧 {riskData.weather.humidity}%
              </Text>
              <Text className="text-xs text-gray-600">
                ☁️ {riskData.weather.description}
              </Text>
            </View>
          </View>
        )}

        {/* Botón para actualizar manualmente */}
        <View className="absolute bottom-4 right-4">
          <TouchableOpacity 
            onPress={detectRealWeatherRisk}
            disabled={loading}
            className={`px-4 py-2 rounded-full ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
          >
            <Text className="text-white text-sm font-medium">
              {loading ? 'Actualizando...' : '🔄 Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de alarma cuando hay riesgo */}
      <Modal
        visible={isAlertActive}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAlertActive(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className={`w-4/5 rounded-2xl p-6 shadow-2xl ${categoryStyle.bgStyle}`}>
            
            {/* Texto principal de la alarma */}
            <Text className="text-center text-white text-2xl font-bold mb-4 leading-8">
              {categoryStyle.text}
            </Text>

            {/* Instrucciones */}
            <Text className="text-white text-base mb-4 leading-6">
              {categoryStyle.instructions}
            </Text>

            {/* Detalles adicionales */}
            <Text className="text-white/80 text-sm mb-6 leading-5">
              {categoryStyle.details}
            </Text>

            {/* Botones de acción */}
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setIsAlertActive(false)}
                className={`flex-1 mr-2 py-3 rounded-xl ${categoryStyle.buttonStyle}`}
              >
                <Text className="text-white text-center font-semibold">
                  Entendido
                </Text>
              </TouchableOpacity>

              <Link href="/risk-analysis" asChild>
                <TouchableOpacity
                  onPress={() => setIsAlertActive(false)}
                  className="flex-1 ml-2 py-3 rounded-xl bg-white/20"
                >
                  <Text className="text-white text-center font-semibold">
                    Ver Detalles
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Información adicional de la alerta */}
            {riskData?.alert && (
              <View className="mt-4 p-3 bg-white/10 rounded-lg">
                <Text className="text-white font-bold text-sm mb-2">
                  ACCIONES RECOMENDADAS:
                </Text>
                {riskData.alert.actions.map((action, index) => (
                  <Text key={index} className="text-white text-sm mb-1">
                    • {action}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
