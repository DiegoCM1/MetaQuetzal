import { Slot, Link } from 'expo-router';
import { View, Text } from 'react-native';
import { TamaguiProvider } from '@tamagui/core';
import config from '../tamagui.config';

export default function Layout() {
  return (
    <TamaguiProvider config={config} defaultTheme="light"> {/* Añadido defaultTheme */}
      <View className="flex-1 bg-gray">
        {/* Aquí se renderizan las demás pantallas */}
        <Slot />
        {/* Barra de navegacion inferior */}
          <View className=" w-full bg-blue-500">
            <View className="flex-row border-b border-gray-300">
              <Link href="/" className="flex-1 p-4 text-white text-center rounded-tl-lg">
                <Text className="text-white font-bold text-center">Home</Text>
              </Link>
              <Link href="/chat-ai" className="flex-1 p-4 text-white text-center">
                <Text className="text-white font-bold text-center">Chat IA</Text>
              </Link>
              <Link href="/settings" className="flex-1 p-4 text-white text-center rounded-bl-lg">
                <Text className="text-white font-bold text-center">Ajustes</Text>
              </Link>
              <Link href="/monetization" className="flex-1 p-4 text-white text-center">
                <Text className="text-white font-bold text-center">Suscripción</Text>
              </Link>
            </View>
          </View>
        
      </View>
    </TamaguiProvider>
  );
}
