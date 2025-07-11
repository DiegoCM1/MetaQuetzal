import React from 'react';
import { View, Text } from 'react-native';

const HurricaneCategory1 = () => {
  return (
    <View className="flex-1 justify-center items-center bg-blue-100">
      <Text className="text-xl font-bold text-blue-500">Huracán Categoría 1</Text>
      <Text className="text-center mt-2">Velocidades de viento: 74-95 mph. Precaución necesaria.</Text>
    </View>
  );
};

export default HurricaneCategory1;
