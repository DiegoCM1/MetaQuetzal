import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useAlerts from "./_hooks/useAlerts";
import useCycloneAdvisories from "./_hooks/useCycloneAdvisories";
import AlertCard from "./_components/AlertCard";
import CycloneAdvisoryCard from "./_components/CycloneAdvisoryCard";
import { colors } from "../../utils/theme";

export default function AlertsListScreen() {
  const router = useRouter();
  const { data, error, isLoading } = useAlerts();
  const { data: cycloneAdvisories } = useCycloneAdvisories();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <ActivityIndicator size="large" color={colors.brandBlue} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <Text className="text-red-500">
          Error al cargar alertas, verifica tu conexión a internet
        </Text>
      </View>
    );
  }

  const hasCycloneAdvisories =
    !!cycloneAdvisories && cycloneAdvisories.length > 0;

  if ((!data || data.length === 0) && !hasCycloneAdvisories) {
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
        <Text className="text-xl font-square721 text-white">Alertas</Text>
        <Pressable
          onPress={() => router.push("/alerts/history")}
          className="flex-row items-center px-3 py-2 rounded-lg bg-brand-blue"
          android_ripple={{ color: "#ddd" }}
        >
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color="#ffff"
          />
          <Text className="ml-2 text-sm font-poppins-semibold text-white">
            Por año
          </Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ padding: 12 }}
        data={data ?? []}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          hasCycloneAdvisories ? (
            <View style={{ marginBottom: 8 }}>
              <Text
                className="text-xs font-poppins-semibold text-white/60 mb-2"
                style={{ letterSpacing: 1, textTransform: "uppercase" }}
              >
                Avisos de ciclón tropical · SMN
              </Text>
              {cycloneAdvisories!.map((advisory, i) => (
                <CycloneAdvisoryCard
                  key={`${advisory.ocean}-${advisory.system_name}-${i}`}
                  advisory={advisory}
                />
              ))}
              {data && data.length > 0 && (
                <Text
                  className="text-xs font-poppins-semibold text-white/60 mt-2 mb-2"
                  style={{ letterSpacing: 1, textTransform: "uppercase" }}
                >
                  Historial
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onPress={() => {
              console.log(
                "[QA_ALERTS] list tap | id:",
                item.id,
                "| level:",
                item.level,
                "| title:",
                item.title,
              );
              router.push({
                pathname: "/alerts/[id]",
                params: { id: item.id },
              });
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}
