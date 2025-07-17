import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "rgb(255, 255, 255)", // tailwind `phase2Buttons`
        tabBarInactiveTintColor: "rgb(200, 200, 200)", // tailwind `phase2Buttons`
        tabBarStyle: { backgroundColor: "rgb(50, 180, 200)" }, // tailwind `phase2bg`
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
            <MaterialCommunityIcons
              name="menu"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
