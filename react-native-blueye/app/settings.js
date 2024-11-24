import "../global.css";
import React, { useState } from "react";
import { ScrollView, Text, Switch } from "react-native";
import { YStack, XStack, Separator } from "tamagui";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <ScrollView className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
      <YStack className="p-6 space-y-8">
        {/* Header */}
        <Text className="text-3xl font-extrabold text-phase2Titles dark:text-phase2TitlesDark">
          Ajustes
        </Text>

        <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

        {/* Opciones */}
        <YStack className="space-y-6">
          {/* Notificaciones */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Notificaciones
            </Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Alarmas */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Alarmas
            </Text>
            <Link
              href="./alarms"
              className="text-phase2Buttons dark:text-phase2ButtonsDark font-bold"
            >
              Editar alarmas
            </Link>
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Opción para el modo oscuro */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Modo Oscuro
            </Text>
            <Switch
              value={colorScheme === "dark"}
              onValueChange={toggleColorScheme}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Tema Daltonismo */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Daltonismo
            </Text>
            <Switch
              value={false}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Idioma */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Idioma
            </Text>
            <Text className="text-phase2Buttons dark:text-phase2ButtonsDark font-bold">
              Español
            </Text>
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Cuenta */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Cuenta
            </Text>
            <Text className="text-phase2Buttons dark:text-phase2ButtonsDark font-bold">
              Editar mis datos
            </Text>
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Familiares */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Familia
            </Text>
            <Text className="text-phase2Buttons dark:text-phase2ButtonsDark font-bold">
              Editar familiares
            </Text>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
