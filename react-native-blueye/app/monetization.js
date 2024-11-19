import "../global.css";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import CardPlan1 from "../components/Card-Plan1"; // Asegúrate de usar el nombre correcto del componente

export default function SubscriptionScreen() {
  return (
    <View className="flex-1 bg-gray-100 items-center">
      <View className="w-full justify-start">
        <Text className="text-xl font-bold bg-blue-500  text-center">Elige el plan ideal para ti</Text>
      </View>

      <View className="justify-center items-center w-full h-full">
        {/* Componente Tamagui con datos personalizados */}
        <CardPlan1
          header="Plan Pro"
          description="Accede a todas las funciones premium con soporte dedicado y más."
          price="$9.99/mes"
        />
        <CardPlan1
          header="Plan Básico"
          description="Disfruta de funciones esenciales para empezar."
          price="$4.99/mes"
        />
        <CardPlan1
          header="Plan Empresarial"
          description="Soluciones avanzadas para equipos y empresas."
          price="$29.99/mes"
        />
        <CardPlan1
          header="Plan Con Seguro"
          description="Soluciones avanzadas para equipos y empresas."
          price="$29.99/mes"
        />
        <CardPlan1
          header="Plan De Gobierno"
          description="Soluciones avanzadas para equipos y empresas."
          price="$29.99/mes"
        />
      </View>      
    </View>
  );
}
