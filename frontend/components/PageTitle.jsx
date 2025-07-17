import React from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';


/**
 * Uso:
 *   <PageTitle>Chat con IA</PageTitle>
 */
export default function PageTitle({ children }) {
  const insets = useSafeAreaInsets(); // { top, bottom, left, right }

  return (
    <View // remove the horizontal padding just for this row
      style={{
        marginLeft: -insets.left,
        marginRight: -insets.right,
        paddingHorizontal: 16, // your own inner padding
      }}
      className="border-b border-phase2Borders dark:border-phase2BordersDark bg-phase2ButtonsDark"
    >
      <Text className="text-2xl font-bold text-white dark:text-phase2TitlesDark text-center pb-2">
        {children}
      </Text>
    </View>
  );
}
