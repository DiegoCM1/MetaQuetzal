import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
      className="flex-row items-center justify-between p-4 bg-gray-100 rounded-lg"
      android_ripple={{ color: "#ddd" }}
    >
      <View className="flex-row items-center">
        <MaterialCommunityIcons
          name="file-document-outline"
          size={28}
          color="#38bdf8"
        />
        <Text className="text-xl font-bold ml-3"></Text>
      </View>

      <View className="flex-row items-center">
        <View className="bg-sky-500 px-3 py-1 rounded-full mr-3">
          <Text className="text-white font-semibold">{alertCount}</Text>
        </View>
        <MaterialCommunityIcons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="#6B7280"
        />
      </View>
    </Pressable>
  );
}
