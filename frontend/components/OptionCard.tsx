import { Text, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { gradients } from "../utils/theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";

interface Props {
    title: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap; 
    route?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean; 
}

export default function OptionCard({ title, icon, route, onPress, rightElement, danger }: Props) {
    const router = useRouter();

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (route) {
            router.push(route as any);
        }
    };

    const contentColor = danger ? "#EF4444" : "white";

    return (
        <Pressable
            onPress={handlePress}
            disabled={!onPress && !route} 
            className="mb-4 mx-4 rounded-r-3xl rounded-bl-3xl rounded-tl-sm overflow-hidden active:opacity-80 shadow-sm"
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            <LinearGradient
                colors={gradients.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 px-5 flex-row items-center"
            >
                <MaterialCommunityIcons name={icon} size={24} color={contentColor} />
                
                <Text className="flex-1 font-poppins-semibold text-lg ml-4" style={{ color: contentColor }}>
                    {title}
                </Text>
                
                {rightElement ? (
                    rightElement
                ) : (route || onPress) ? (
                    <MaterialCommunityIcons 
                        name="chevron-right" 
                        size={24} 
                        color={danger ? "#EF4444" : "rgba(255,255,255,0.7)"} 
                    />
                ) : null}
            </LinearGradient>
        </Pressable>
    );
}