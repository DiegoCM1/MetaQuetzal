import { View, Text, TextInput } from "react-native";

export default function Home() {
  return (
    <View className="flex-1">

      {/* Barra de búsqueda */}
      <View className="bg-black shadow p-4 flex-row items-center">
        <TextInput
          className="flex-1 bg-gray-100 p-2 rounded-md color-slate-400"
          placeholder="Search location..."
        />
      </View>

      {/* Contenedor del mapa */}
      <View className="flex-1 bg-gray-200 items-center justify-center">
        <Text className="text-gray-400 text-lg">
          Aquí irá el mapa (react-native-maps/mapbox).
        </Text>
      </View>
    </View>
  );
}
