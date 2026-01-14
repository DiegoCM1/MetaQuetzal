import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

/**
 * Alerts section layout with Stack navigator
 * Handles: index (list), [id] (details), history (by year)
 */
export default function AlertsLayout() {
  const { colorScheme } = useColorScheme();

  const headerBg =
    colorScheme === "dark" ? "rgb(40, 60, 80)" : "rgb(60, 200, 220)";
  const headerTint = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#fff";

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerTint,
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Tab already shows, no double header
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Detalles de Alerta",
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "Historial por Año",
        }}
      />
    </Stack>
  );
}
