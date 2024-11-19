import "../global.css";
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import CardPlan1 from "../components/Card-Plan1"; // Asegúrate de usar el nombre correcto del componente

export default function SubscriptionScreen() {
  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-xl font-bold mb-4">Suscripción Anual</Text>
      <Text className="text-lg mb-2">Plan Premium</Text>
      <Text className="text-gray-700 mb-6">$49.99 USD / año</Text>

      {/* Componente Tamagui */}
      <CardPlan1 />

      <TouchableOpacity className="bg-blue-500 py-3 rounded-lg">
        <Text className="text-white text-center font-bold">Suscribirse</Text>
      </TouchableOpacity>
    </View>
  );
}
