// MoreScreen.jsx
import React from "react";
import { Text, Pressable, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import PageTitle from "../../components/PageTitle";

export default function MoreScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();          // "light" | "dark"

  // palette
  const iconColor   = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#1F2937"; // blue‑400 / gray‑800
  const arrowColor  = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#111827"; // blue‑300 / gray‑400
  const textColor   = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#111827"; // blue‑100 / gray‑900

  const items = [
    { label: "Ajustes",            icon: "cog-outline",           screen: "SettingsScreen" },
    { label: "Alarma",             icon: "alarm",                 screen: "AlarmScreen"    },
    { label: "Feedback",           icon: "message-reply-outline", screen: "FeedbackScreen" },
    { label: "Acerca de nosotros", icon: "information",           screen: "AboutScreen"    },
  ];

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      className="flex-1 bg-white dark:bg-neutral-900"
    >
      <PageTitle>Más</PageTitle>

      {items.map(({ label, icon, screen }) => (
        <Pressable
          key={screen}
          onPress={() => navigation.navigate(screen)}
          android_ripple={{ color: "rgba(0,0,0,0.07)" }}
          className="flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700"
        >
          <MaterialCommunityIcons
            name={icon}
            size={24}
            color={iconColor}
            style={{ marginRight: 16 }}
          />

          <Text
            style={{ color: textColor }}
            className="flex-1 text-base"
          >
            {label}
          </Text>

          <MaterialCommunityIcons
            name="chevron-right"
            size={26}
            color={arrowColor}
          />
        </Pressable>
      ))}
    </SafeAreaView>
  );
}
