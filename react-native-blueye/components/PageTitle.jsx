import React from "react";
import { View, Text } from "react-native";

/**
 * Uso:
 *   <PageTitle>Chat con IA</PageTitle>
 */
export default function PageTitle({ children }) {
  return (
    <View className="w-full mt-4 px-4">
      <Text
        className="text-xl font-bold text-phase2Titles dark:text-phase2TitlesDark
                   text-center border-b border-phase2Borders dark:border-phase2BordersDark
                   pb-2"
      >
        {children}
      </Text>
    </View>
  );
}
