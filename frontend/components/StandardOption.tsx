import { Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { gradients } from "../utils/theme";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
    title: string;
    // Strict typing for valid Expo vector icons
    icon: keyof typeof MaterialCommunityIcons.glyphMap; 
    route: string;
}

export default function StandardOption({ title, icon, route }: Props) {
    const router = useRouter();

    return (
        <Pressable
            // Push forward to the assigned route
            onPress={() => router.push(route as any)} 
            className="mb-4 rounded-r-3xl rounded-b-3xl rounded-tl-sm rounded-b- overflow-hidden active:opacity-80 mx-4 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel={`Go to ${title}`}
        >
            <LinearGradient
                colors={gradients.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 px-5 flex-row items-center"
            >
                {/* Dynamic Icon from props */}
                <MaterialCommunityIcons name={icon} size={24} color="white" />
                
                <Text className="flex-1 text-white font-poppins-semibold text-lg ml-4">
                    {title}
                </Text>
                
                {/* Standard UX: Right chevron implies navigating deeper */}
                <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
        </Pressable>
    );
}