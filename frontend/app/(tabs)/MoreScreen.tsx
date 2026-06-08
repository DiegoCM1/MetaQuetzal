import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OptionCard from "../../components/OptionCard";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const IS_DEV_BUILD =
  (process.env.EXPO_PUBLIC_API_URL ?? '').includes('staging') ||
  (process.env.EXPO_PUBLIC_API_URL ?? '').includes('localhost') ||
  (process.env.EXPO_PUBLIC_API_URL ?? '').includes('192.168') ||
  __DEV__;

type MenuItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
};

export default function MoreScreen() {
  const items: MenuItem[] = [
    { label: "Chat offline", icon: "access-point-network", route: "/local-chat" },
    { label: "Contactos SOS", icon: "account-heart-outline", route: "/SOSContactsScreen" },
    { label: "Feedback", icon: "message-reply-outline", route: "/FeedbackScreen" },
    { label: "Ajustes", icon: "cog-outline", route: "/SettingsScreen" },
    // { label: "Suscripción", icon: "account-group-outline", route: "/subscription" },
    ...(IS_DEV_BUILD
      ? [{ label: "Dev: Notificaciones", icon: "bell-ring-outline" as const, route: "/NotificationTestScreen" }]
      : []),
  ];

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      className="flex-1 bg-transparent"
    >
      <ScrollView 
        className="flex-1 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <OptionCard 
            key={item.route} 
            title={item.label} 
            icon={item.icon} 
            route={item.route} 
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}