import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Alerts section layout with Stack navigator
 * Handles: index (list), [id] (details), history (by year)
 */
export default function AlertsLayout() {
  return (
    <>
      <StatusBar style="light" translucent={false} />
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: "bold" },
        contentStyle: { backgroundColor: 'transparent' },
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </>
  );
}
