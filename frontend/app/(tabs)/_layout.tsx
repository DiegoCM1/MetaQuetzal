import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const barBg =
    colorScheme === "dark" ? "rgb(40, 60, 80)" : "rgb(60, 200, 220)";
  const activeTint =
    colorScheme === "dark" ? "rgb(230, 230, 250)" : "rgb(255, 255, 255)";
  const inactiveTint =
    colorScheme === "dark" ? "rgb(180, 180, 200)" : "rgb(220, 220, 220)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: { backgroundColor: barBg },
        tabBarHideOnKeyboard: true, // Hide the tab bar when the keyboard is open so it doesn't overlap the text input on Android builds
      }}
    >
      <Tabs.Screen
        name="MapScreen"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="ChatAIScreen"
        options={{
          title: "Chat-AI",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="robot-happy"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="AlertsHistoryScreen"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="bell-alert-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="MoreScreen"
        options={{
          title: "Más",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
