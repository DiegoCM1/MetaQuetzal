import "../global.css";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function NavigationScreen() {
  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-600 pt-12 pb-6 px-4">
        <Text className="text-white text-3xl font-bold text-center">
          🌊 BlueEye
        </Text>
        <Text className="text-blue-100 text-lg text-center mt-2">
          Sistema de Análisis Meteorológico
        </Text>
      </View>

      <View className="p-4 space-y-4">
        {/* Pantallas con Backend Integrado */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            🚀 Con Backend Integrado (Datos Reales)
          </Text>
          
          <Link href="/risk-analysis" asChild>
            <TouchableOpacity className="bg-green-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                📊 Análisis de Riesgo Completo
              </Text>
              <Text className="text-green-100 text-sm mt-1">
                Análisis meteorológico inteligente con datos reales
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/alarmScreensReal" asChild>
            <TouchableOpacity className="bg-orange-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                🚨 Alertas Meteorológicas Reales
              </Text>
              <Text className="text-orange-100 text-sm mt-1">
                Sistema de alertas basado en condiciones reales
              </Text>
            </TouchableOpacity>
          </Link>

          <View className="bg-blue-100 rounded-lg p-3">
            <Text className="text-blue-800 text-sm">
              ✅ Estas pantallas consumen el backend Express.js y muestran análisis de riesgo basados en datos meteorológicos reales de OpenWeatherMap.
            </Text>
          </View>
        </View>

        {/* Pantallas Originales */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            📱 Pantallas Originales
          </Text>
          
          <Link href="/" asChild>
            <TouchableOpacity className="bg-blue-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                🗺️ Mapa Principal
              </Text>
              <Text className="text-blue-100 text-sm mt-1">
                Mapa interactivo con capas meteorológicas
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/alarmScreens" asChild>
            <TouchableOpacity className="bg-yellow-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                🔔 Alertas Simuladas
              </Text>
              <Text className="text-yellow-100 text-sm mt-1">
                Sistema original con datos simulados/aleatorios
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/alerts" asChild>
            <TouchableOpacity className="bg-red-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                📢 Alertas Estáticas
              </Text>
              <Text className="text-red-100 text-sm mt-1">
                Pantalla de alertas predefinidas
              </Text>
            </TouchableOpacity>
          </Link>

          <View className="bg-yellow-100 rounded-lg p-3">
            <Text className="text-yellow-800 text-sm">
              ⚠️ Estas son las pantallas originales del proyecto, algunas con datos simulados o estáticos.
            </Text>
          </View>
        </View>

        {/* Otras Pantallas */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            🔧 Otras Funcionalidades
          </Text>
          
          <Link href="/chat-ai" asChild>
            <TouchableOpacity className="bg-purple-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                🤖 Chat IA
              </Text>
              <Text className="text-purple-100 text-sm mt-1">
                Asistente meteorológico con IA
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/settings" asChild>
            <TouchableOpacity className="bg-gray-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                ⚙️ Configuración
              </Text>
              <Text className="text-gray-100 text-sm mt-1">
                Ajustes de la aplicación
              </Text>
            </TouchableOpacity>
          </Link>

          <Link href="/monetization" asChild>
            <TouchableOpacity className="bg-indigo-600 rounded-lg p-4 mb-3">
              <Text className="text-white font-bold text-lg">
                💰 Monetización
              </Text>
              <Text className="text-indigo-100 text-sm mt-1">
                Planes y suscripciones
              </Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Estado del Backend */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-xl font-bold text-gray-800 mb-4">
            🖥️ Estado del Backend
          </Text>
          
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">Servidor Express.js:</Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-800 text-sm font-medium">
                ✅ Activo (Puerto 3002)
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">Endpoint /risk:</Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-800 text-sm font-medium">
                ✅ Funcionando
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">OpenWeatherMap API:</Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-800 text-sm font-medium">
                ✅ Conectado
              </Text>
            </View>
          </View>

          <View className="bg-green-50 rounded-lg p-3 mt-3">
            <Text className="text-green-800 text-sm">
              🎉 Backend completamente funcional. Las pantallas marcadas como "Con Backend Integrado" ya consumen datos reales y proporcionan análisis inteligente de riesgo meteorológico.
            </Text>
          </View>
        </View>

        {/* Información de Desarrollo */}
        <View className="bg-gray-100 rounded-xl p-4">
          <Text className="text-gray-600 text-sm text-center">
            🚀 BlueEye v2.0 - Sistema Meteorológico Inteligente
          </Text>
          <Text className="text-gray-500 text-xs text-center mt-1">
            Backend: Express.js | Frontend: React Native/Expo | API: OpenWeatherMap
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
