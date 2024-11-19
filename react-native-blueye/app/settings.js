import "../global.css";
import React, { useState } from "react";
import { View, Text, Switch, ScrollView } from 'react-native';
import { TamaguiProvider } from "@tamagui/core";  // Importa TamaguiProvider
import config from "../tamagui.config";  // Importa la configuración de Tamagui
import { YStack, XStack, Separator } from 'tamagui';


export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <TamaguiProvider config={config}>  {/* TamaguiProvider envolviendo el componente */}
      <ScrollView className="bg-gray-100 flex-1">
      <YStack className="p-4 space-y-6">
        {/* Header */}
        <Text className="text-2xl font-bold text-gray-800">Ajustes</Text>

        <Separator className="h-px bg-gray-300" />

        {/* Opciones */}
        <YStack className="space-y-4">
          {/* Notificaciones */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-gray-700">Notificaciones</Text>
            <Switch value={true} className="bg-gray-300" />
          </XStack>

          <Separator className="h-px bg-gray-300" />

          {/* Tema Oscuro */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-gray-700">Tema Oscuro</Text>
            <Switch value={false} className="bg-gray-300" />
          </XStack>

          <Separator className="h-px bg-gray-300" />

          {/* Idioma */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-gray-700">Idioma</Text>
            <Text className="text-blue-600">Español</Text>
          </XStack>

          <Separator className="h-px bg-gray-300" />

          {/* Cuenta */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-gray-700">Cuenta</Text>
            <Text className="text-blue-600">Español</Text>
          </XStack>

          <Separator className="h-px bg-gray-300" />

          {/* Familiares */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-gray-700">Familia</Text>
            <Text className="text-blue-600">Español</Text>
          </XStack>
          
        </YStack>
      </YStack>
    </ScrollView>

    </TamaguiProvider>
  );
}
