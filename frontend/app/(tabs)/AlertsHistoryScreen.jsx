import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import useAlerts from "../../hooks/useAlerts";
import AlertCard from "../../components/AlertCard";

export default function AlertsHistoryScreen() {
  const router = useRouter();
  const { data, error, isLoading } = useAlerts();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Error al cargar alertas</Text>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No hay alertas</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["top", "left", "right", "bottom"]}
    >
      <FlatList
        contentContainerStyle={{ padding: 12 }}
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onPress={() =>
              router.push({
                pathname: "AlertDetailsScreen",
                params: { id: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}
