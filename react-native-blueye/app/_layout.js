import { Slot, Link } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "@tamagui/core";
import config from "../tamagui.config";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function Layout() {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        {" "}
        {/* Añadido defaultTheme */}
        <View className="flex-1 bg-gray">
          {/* Aquí se renderizan las demás pantallas */}
          <Slot />
          {/* Barra de navegacion inferior */}
          <View className=" w-full bg-blue-500">
            <View className="flex-row border-b border-gray-300">
              <Link
                href="/"
                className="flex-1 p-4 text-white text-center rounded-tl-lg"
              >
                {/* Ícono de Ionicons */}
                <Ionicons name="home" size={32} color="white" />
              </Link>
              <Link
                href="/chat-ai"
                className="flex-1 p-4 text-white text-center"
              >
                {/* Ícono de MaterialCommunityIcons */}
                <MaterialCommunityIcons
                  name="robot-happy"
                  size={32}
                  color="white"
                />
              </Link>
              <Link
                href="/settings"
                className="flex-1 p-4 text-white text-center rounded-bl-lg"
              >
                {/* Ícono de MaterialIcons */}
                <MaterialIcons name="settings" size={32} color="white" />
              </Link>
              <Link
                href="/monetization"
                className="flex-1 p-4 text-white text-center"
              >
                {/* Ícono de MaterialCommunityIcons */}
                <MaterialCommunityIcons
                  name="account-cash"
                  size={32}
                  color="white"
                />
              </Link>
            </View>
          </View>
        </View>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
