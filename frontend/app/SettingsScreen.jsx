import "../global.css";
import { useState } from "react";
import { ScrollView, Text, Switch, Alert, Pressable } from "react-native";
import { YStack, XStack, Separator } from "tamagui";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  const { colorScheme, toggleColorScheme } = useColorScheme();

  const showComingSoon = () => {
    Alert.alert("¡Próximamente!", "Esta opción estará disponible muy pronto.");
  };

  // Modo daltónico aún no implementado
  const handleDaltonicToggle = () => {
    Alert.alert("¡Próximamente!", "Esta función estará disponible muy pronto.");
  };

  // Manejar el cambio del modo oscuro
  const handleDarkModeToggle = () => {
    toggleColorScheme();
  };

  return (
    <ScrollView className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
      <YStack className="p-6 space-y-8">
        {/* Header */}

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
              href="/AlertDetailsScreen"
              className="font-bold text-phase2Buttons dark:text-phase2ButtonsDark"
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
              onValueChange={handleDarkModeToggle}
            />
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Tema Daltonismo */}
          <XStack className="items-center justify-between">
            <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
              Daltonismo
            </Text>
            <Switch value={false} onValueChange={handleDaltonicToggle} />
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Idioma */}
          <XStack className="items-center justify-between">
            <Pressable
              onPress={showComingSoon}
              className="flex-row flex-1 justify-between items-center"
            >
              <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
                Idioma
              </Text>
              <Text className="font-bold text-phase2Buttons dark:text-phase2ButtonsDark">
                Español
              </Text>
            </Pressable>
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Cuenta */}
          <XStack className="items-center justify-between">
            <Pressable
              onPress={showComingSoon}
              className="flex-row flex-1 justify-between items-center"
            >
              <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
                Cuenta
              </Text>
              <Text className="font-bold text-phase2Buttons dark:text-phase2ButtonsDark">
                Editar mis datos
              </Text>
            </Pressable>
          </XStack>

          <Separator className="h-1 bg-phase2Borders dark:bg-phase2BordersDark" />

          {/* Familiares */}
          <XStack className="items-center justify-between">
            <Pressable
              onPress={showComingSoon}
              className="flex-row flex-1 justify-between items-center"
            >
              <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
                Familia
              </Text>
              <Text className="font-bold text-phase2Buttons dark:text-phase2ButtonsDark">
                Editar familiares
              </Text>
            </Pressable>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
