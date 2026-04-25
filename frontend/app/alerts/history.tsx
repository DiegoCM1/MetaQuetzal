import { useState, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import useAlerts from "./_hooks/useAlerts";
import AlertCard from "./_components/AlertCard";
import YearListItem from "./_components/YearListItem";
import { groupAlertsByYear, getSortedYears } from "./_utils/groupByYear";
import { track } from "../../utils/analytics";
import ScreenHeader from "../../components/ScreenHeader"
import { colors } from "../../utils/theme"


export default function AlertsHistoryByYearScreen() {
  const router = useRouter();
  const { data, error, isLoading } = useAlerts();
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const alertsByYear = useMemo(() => {
    if (!data || data.length === 0) return {};
    return groupAlertsByYear(data);
  }, [data]);

  const years = useMemo(() => {
    return getSortedYears(alertsByYear);
  }, [alertsByYear]);

  const handleYearPress = (year: number) => {
    track("alerts_year_tap", { year });
    setExpandedYear(expandedYear === year ? null : year);
  };

  const handleAlertPress = (alertId: string) => {
    router.push({
      pathname: "/alerts/[id]",
      params: { id: alertId },
    });
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <ActivityIndicator size="large" color={colors.brandBlue} />
        <Text className="mt-4 font-poppins text-white/60">
          Cargando historial...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={colors.brandRed}
        />
        <Text className="mt-4 font-poppins text-brand-red">Error al cargar el historial</Text>
      </View>
    );
  }

  if (years.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <MaterialCommunityIcons
          name="file-document-outline"
          size={48}
          color={colors.brandBlue}
        />
        <Text className="mt-4 font-poppins text-white/50">
          No hay historial de alertas
        </Text>
      </View>
    );
  }

  const renderYearItem = ({ item: year }: { item: number }) => {
    const alertsForYear = alertsByYear[year] || [];
    const isExpanded = expandedYear === year;

    return (
      <View className="mb-3">
        <YearListItem
          year={year}
          alertCount={alertsForYear.length}
          isExpanded={isExpanded}
          onPress={() => handleYearPress(year)}
        />

        {isExpanded && (
          <View className="mt-2 ml-4">
            {alertsForYear.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert.id)}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-transparent"
      edges={["top", "bottom"]}
    >
      <ScreenHeader title="Historial de alertas " />
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={years}
        keyExtractor={(item) => item.toString()}
        renderItem={renderYearItem}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="font-poppins text-white/50 text-center">
              Selecciona un año para ver las alertas
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
