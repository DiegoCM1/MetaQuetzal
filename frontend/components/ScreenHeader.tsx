import { View, Text, Pressable } from "react-native";
import { gradients } from "../utils/theme";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface Props {
  title: string;
}

export default function ScreenHeader({ title }: Props) {
  const router = useRouter();

  return (
    <View className="self-start max-w-[72%] rounded-tr-3xl overflow-hidden">
      <LinearGradient
        colors={gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="py-3 pr-10 flex-row items-center"
      >
        <Pressable
          onPress={() => router.back()}
          className="pl-3 pr-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
        </Pressable>
        {/* shrink-to-content (capped at 72% width); never exceeds 2 lines */}
        <Text
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          className="shrink text-white font-poppins-semibold text-xl pr-4"
        >
          {title}
        </Text>
      </LinearGradient>
    </View>
  );
}
