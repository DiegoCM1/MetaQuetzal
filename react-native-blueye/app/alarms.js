import "../global.css";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Button } from "react-native";
import HurricaneCategory1 from "../components/hurricane-category-1";
import HurricaneCategory2 from "../components/hurricane-category-2";
import HurricaneCategory3 from "../components/hurricane-category-3";
import HurricaneCategory4 from "../components/hurricane-category-4";
import HurricaneCategory5 from "../components/hurricane-category-5";

export default function AlarmsScreen() {
  // Estado para almacenar la categoría actual (por defecto categoría 1)
  const [category, setCategory] = useState(1);

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
        return (
          <View className="flex-1 justify-center items-center bg-gray-100">
            <Text className="text-lg text-gray-500">
              Selecciona una categoría válida.
            </Text>
          </View>
        );
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Text className="text-xl font-bold text-center my-4">
        Información de Huracanes
      </Text>

      {/* Renderiza el componente correspondiente */}
      {renderCategory()}

      {/* Botones para cambiar categorías */}
      <View className="flex-row justify-around mt-4">
        <Button title="Categoría 1" onPress={() => setCategory(1)} />
        <Button title="Categoría 2" onPress={() => setCategory(2)} />
        <Button title="Categoría 3" onPress={() => setCategory(3)} />
        <Button title="Categoría 4" onPress={() => setCategory(4)} />
        <Button title="Categoría 5" onPress={() => setCategory(5)} />
      </View>
    </View>
  );
}
