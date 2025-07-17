// more.jsx  (or MoreScreen.jsx)
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageTitle from "../../components/PageTitle";

export default function MoreScreen() {
  const navigation = useNavigation();

  const items = [
    { label: "Ajustes", icon: "settings-outline", screen: "SettingsScreen" },
    { label: "Alarma", icon: "alarm-outline", screen: "AlarmScreen" },
    {
      label: "Feedback",
      icon: "chatbox-ellipses-outline",
      screen: "FeedbackScreen",
    },
    {
      label: "Acerca de nosotros",
      icon: "information-circle-outline",
      screen: "AboutScreen",
    },
  ];

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["left", "right", "bottom"]}
    >
      {" "}
      <PageTitle>Más</PageTitle>
      {items.map(({ label, icon, screen }) => (
        <Pressable
          key={screen}
          className="flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700"
          android_ripple={{ color: "#e5e7eb" }} // light ripple
          onPress={() => navigation.navigate(screen)}
        >
          <Ionicons
            name={icon}
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            {label}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            className="text-gray-400 dark:text-gray-500"
          />
        </Pressable>
      ))}
    </SafeAreaView>
  );
}
