import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import OptionCard from "../../components/OptionCard";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type MenuItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
};

export default function MoreScreen() {
  const items: MenuItem[] = [
    { label: "Ajustes", icon: "cog-outline", route: "/SettingsScreen" },
    { label: "Feedback", icon: "message-reply-outline", route: "/FeedbackScreen" },
    // { label: "Suscripción", icon: "account-group-outline", route: "/subscription" },
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