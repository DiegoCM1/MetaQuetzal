import { View, Text, Pressable } from "react-native";
import { gradients } from "../utils/theme"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

interface Props {
  title: string
}

export default function ScreenHeader({ title }: Props) {
  const router = useRouter()

  return (
    <View className="rounded-tr-3xl overflow-hidden mr-56">
      <LinearGradient
        colors={gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="py-3 pr-10 flex-row items-center"
      >
        <Pressable onPress={() => router.back()} className="pl-3 pr-2">
          <MaterialCommunityIcons name="chevron-left" size={24} color="white" />
        </Pressable>
        <Text className="flex-1 text-white font-poppins-semibold text-xl text-center pr-6">
          {title}
        </Text>
      </LinearGradient>
    </View>
  )
}
