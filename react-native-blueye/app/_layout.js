import { Slot, Link } from 'expo-router';
import { View, Text } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '../tamagui.config';

export default function Layout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light"> {/* Añadido defaultTheme */}
      <View className="flex-1 bg-gray-100">
        {/* Layout de navegación */}
        <View className="items-center justify-center p-4">
          <View className="border border-gray-300 bg-white rounded-lg w-full max-w-md">
            <View className="flex-row border-b border-gray-300">
              <Link href="/" className="flex-1 p-4 bg-blue-500 text-white text-center rounded-tl-lg">
                <Text className="text-white font-bold text-center">Home</Text>
              </Link>
              <Link href="/chat-ai" className="flex-1 p-4 bg-blue-500 text-white text-center">
                <Text className="text-white font-bold text-center">Chat IA</Text>
              </Link>
            </View>
            <View className="flex-row">
              <Link href="/settings" className="flex-1 p-4 bg-blue-500 text-white text-center rounded-bl-lg">
                <Text className="text-white font-bold text-center">Settings</Text>
              </Link>
              <Link href="/monetization" className="flex-1 p-4 bg-blue-500 text-white text-center">
                <Text className="text-white font-bold text-center">Monetization</Text>
              </Link>
            </View>
          </View>
        </View>
        {/* Aquí se renderizan las demás pantallas */}
        <Slot />
      </View>
    </TamaguiProvider>
  );
}
