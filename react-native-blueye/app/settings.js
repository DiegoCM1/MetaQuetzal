import "../global.css";
import React, { useState } from "react";
import { View, Text, Switch, ScrollView } from "react-native";
import config from "../tamagui.config"; // Importa la configuración de Tamagui
import { YStack, XStack, Separator } from "tamagui";
import { Link } from "expo-router";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
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
              <Switch value={true} />
            </XStack>

            <Separator className="h-px bg-gray-300" />

            {/* Alarmas */}
            <XStack className="items-center justify-between">
              <Text className="text-lg text-gray-700">Alarmas</Text>
              <Link href={"./alarms"} className="text-red-800">
                Editar alarmas
              </Link>
            </XStack>

            <Separator className="h-px bg-gray-300" />

            {/* Tema Oscuro */}
            <XStack className="items-center justify-between">
              <Text className="text-lg text-gray-700">Tema Oscuro</Text>
              <Switch value={false} />
            </XStack>

            <Separator className="h-px bg-gray-300" />

            {/* Tema Daltonismo */}
            <XStack className="items-center justify-between">
              <Text className="text-lg text-gray-700">Daltonismo</Text>
              <Switch value={false} />
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
              <Text className="text-blue-600">Editar mis datos</Text>
            </XStack>

            <Separator className="h-px bg-gray-300" />

            {/* Familiares */}
            <XStack className="items-center justify-between">
              <Text className="text-lg text-gray-700">Familia</Text>
              <Text className="text-blue-600">Editar familiares</Text>
            </XStack>

            <Separator className="h-px bg-gray-300" />
          </YStack>
        </YStack>
      </ScrollView>
  );
}
