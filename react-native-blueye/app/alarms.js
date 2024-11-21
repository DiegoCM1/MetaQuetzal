import "../global.css"; 
import React, { useState, useEffect } from "react";
import { View, Text, Button, Modal, TouchableOpacity } from "react-native";
import HurricaneCategory1 from "../components/hurricane-category-1";
import HurricaneCategory2 from "../components/hurricane-category-2";
import HurricaneCategory3 from "../components/hurricane-category-3";
import HurricaneCategory4 from "../components/hurricane-category-4";
import HurricaneCategory5 from "../components/hurricane-category-5";

export default function AlarmsScreen() {
  const [category, setCategory] = useState(1); // Categoría actual
  const [isHurricaneNearby, setIsHurricaneNearby] = useState(false); // Controla si se muestra la alarma

  // Simula la detección de huracanes cercanos
  const detectNearbyHurricane = async () => {
    // Simula una llamada API para verificar huracanes cercanos
    const hurricaneData = {
      isNearby: true, // Cambiar a `false` para simular ausencia de huracanes
      category: Math.floor(Math.random() * 5) + 1, // Categoría aleatoria entre 1 y 5
    };

    if (hurricaneData.isNearby) {
      setCategory(hurricaneData.category); // Actualiza la categoría según los datos
      setIsHurricaneNearby(true); // Activa el modal de alarma
    }
  };

  // Genera un número aleatorio del 1 al 5 y cambia la categoría manualmente
  const handleRandomCategory = () => {
    const randomCategory = Math.floor(Math.random() * 5) + 1;
    setCategory(randomCategory);
  };

  // Llama a la detección de huracanes al montar el componente
  useEffect(() => {
    const interval = setInterval(detectNearbyHurricane, 10000); // Verifica cada 10 segundos
    return () => clearInterval(interval); // Limpia el intervalo al desmontar
  }, []);

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

      {/* Botón para generar categoría aleatoria */}
      <View className="flex-row justify-center mt-4">
        <Button
          title="Generar Categoría Aleatoria"
          onPress={handleRandomCategory}
        />
      </View>

      {/* Modal de alarma */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isHurricaneNearby}
        onRequestClose={() => setIsHurricaneNearby(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="w-4/5 bg-white p-5 rounded-xl items-center shadow-lg">
            <Text className="text-2xl font-bold mb-2 text-red-600 text-center">
              ⚠️ ¡Alerta de Huracán Detectado!
            </Text>
            <Text className="text-lg text-center mb-5">
              Se ha detectado un huracán de categoría {category} cerca de tu ubicación.
            </Text>
            <TouchableOpacity
              className="bg-red-500 py-2 px-5 rounded-md"
              onPress={() => setIsHurricaneNearby(false)}
            >
              <Text className="text-white font-bold">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
