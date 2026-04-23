import React from "react";
import { ScrollView } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import StandardOption from "../../components/StandardOption";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Defining the type for your array so TS stays happy
type MenuItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
};

export default function MoreScreen() {
  const { colorScheme } = useTheme();

  // You defined these colors, but StandardOption is currently 
  // using white inside a gradient. If you drop the gradient later, 
  // you can pass these down as props!
  const items: MenuItem[] = [
    { label: "Ajustes", icon: "cog-outline", route: "/SettingsScreen" },
    { label: "Feedback", icon: "message-reply-outline", route: "/FeedbackScreen" },
    { label: "Suscripción", icon: "account-group-outline", route: "/subscription" },
  ];

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      className={`flex-1`}
    >
      <ScrollView 
        className="flex-1 pt-6"
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => (
          <StandardOption 
            key={item.route} // CRITICAL: React needs a unique key for mapped lists
            title={item.label} 
            icon={item.icon} 
            route={item.route} 
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}