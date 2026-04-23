import { View, Text, FlatList, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useAlerts from "./_hooks/useAlerts";
import AlertCard from "./_components/AlertCard";

export default function AlertsListScreen() {
  const router = useRouter();
  const { data, error, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <Text className="text-red-500">Error al cargar alertas, verifica tu conexión a internet</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <Text className="text-white">No hay alertas</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-transparent"
      edges={["top", "left", "right", "bottom"]}
    >
      {/* Header with history button */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-xl font-bold text-white">Alertas</Text>
        <Pressable
          onPress={() => router.push("/alerts/history")}
          className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg"
          android_ripple={{ color: "#ddd" }}
        >
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color="#38bdf8"
          />
          <Text className="ml-2 text-sm font-medium text-white">Por año</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 12 }}
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onPress={() =>
              router.push({
                pathname: "/alerts/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
