import "../global.css";
import React, { useState } from "react";
import { ScrollView, Text, Switch } from "react-native";
import { YStack, XStack, Separator } from "tamagui";
import { Link } from "expo-router";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <ScrollView className="flex-1">
      <YStack className="p-6 space-y-8">
        {/* Header */}
        <Text className="text-3xl font-extrabold text-phase2Titles">
          Ajustes
        </Text>

        <Separator className="h-1 bg-phase2Borders" />

        {/* Opciones */}
        <YStack className="space-y-6">
          {/* Notificaciones */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Notificaciones</Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Alarmas */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Alarmas</Text>
            <Link href="./alarms" className="text-phase2Buttons font-bold">
              Editar alarmas
            </Link>
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Tema Oscuro */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Modo Oscuro</Text>
            <Switch
              value={false}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(30, 30, 60)" }}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Tema Daltonismo */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Daltonismo</Text>
            <Switch
              value={false}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Idioma */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Idioma</Text>
            <Text className="text-phase2Buttons font-bold">Español</Text>
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Cuenta */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Cuenta</Text>
            <Text className="text-phase2Buttons font-bold">Editar mis datos</Text>
          </XStack>

          <Separator className="h-1 bg-phase2Borders" />

          {/* Familiares */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles">Familia</Text>
            <Text className="text-phase2Buttons font-bold">Editar familiares</Text>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
