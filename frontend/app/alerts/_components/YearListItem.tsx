import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../../utils/theme";

interface YearListItemProps {
  year: number;
  alertCount: number;
  isExpanded: boolean;
  onPress: () => void;
}

export default function YearListItem({
  year,
  alertCount,
  isExpanded,
  onPress,
}: YearListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-4 rounded-lg"
      style={{ backgroundColor: 'rgba(49, 103, 255, 0.1)' }}
      android_ripple={{ color: colors.brandBlue }}
    >
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name="file-document-outline"
          size={28}
          color={colors.brandCyan}
        />
        <Text className="text-xl font-poppins-semibold text-white ml-3">{year}</Text>
      </View>

      <View className="flex-row items-center">
        <View className="px-3 py-1 rounded-full mr-3" style={{ backgroundColor: colors.brandBlue }}>
          <Text className="text-white font-poppins-semibold">{alertCount}</Text>
        </View>
        <MaterialCommunityIcons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="white"
        />
      </View>
    </Pressable>
  );
}
