import "../global.css";
import { useState } from "react";
import { ScrollView, Text, Switch } from "react-native";
import { YStack, XStack, Separator } from "tamagui";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);

  const { colorScheme, toggleColorScheme } = useColorScheme();

  const [isDaltonicMode, setIsDaltonicMode] = useState(false); // Estado para el modo daltónico

  // Manejar el cambio del modo daltónico
  const handleDaltonicToggle = () => {
    if (!isDaltonicMode) {
      // Desactivar modo oscuro al activar el modo daltónico
      if (colorScheme === "dark") {
        toggleColorScheme();
      }
    }
    setIsDaltonicMode(!isDaltonicMode);
  };

  // Manejar el cambio del modo oscuro
  const handleDarkModeToggle = () => {
    if (colorScheme !== "dark") {
      // Desactivar modo daltónico al activar el modo oscuro
      if (isDaltonicMode) {
        setIsDaltonicMode(false);
      }
    }
    toggleColorScheme();
  };

  return (
    <ScrollView
      className={`flex-1 ${
        isDaltonicMode
          ? "bg-phase2bgDaltonic" // Fondo en modo daltónico
          : "bg-phase2bg dark:bg-phase2bgDark" // Fondo normal y modo oscuro
      }`}
    >
      <YStack className="p-6 space-y-8">
        {/* Header */}
        <Text
          className={`text-3xl font-extrabold ${
            isDaltonicMode
              ? "text-phase2TitlesDaltonic" // Texto en modo daltónico
              : "text-phase2Titles dark:text-phase2TitlesDark" // Texto normal y oscuro
          }`}
        >
          Ajustes
        </Text>

        <Separator
          className={`h-1 ${
            isDaltonicMode
              ? "bg-phase2BordersDaltonic" // Separador en modo daltónico
              : "bg-phase2Borders dark:bg-phase2BordersDark" // Separador normal y oscuro
          }`}
        />

        {/* Opciones */}
        <YStack className="space-y-6">
          {/* Notificaciones */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic" // Texto en modo daltónico
                  : "text-phase2Titles dark:text-phase2TitlesDark" // Texto normal y oscuro
              }`}
            >
              Notificaciones
            </Text>
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Alarmas */}
          <XStack className="items-center justify-between">
            <Text 
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Alarmas
            </Text>
            <Link
              href="/alerts-info"
              className={`font-bold ${
                isDaltonicMode
                  ? "text-phase2ButtonsDaltonic"
                  : "text-phase2Buttons dark:text-phase2ButtonsDark"
              }`}
            >
              Editar alarmas
            </Link>
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Opción para el modo oscuro */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Modo Oscuro
            </Text>
            <Switch
              value={colorScheme === "dark"}
              onValueChange={handleDarkModeToggle}
            />
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Tema Daltonismo */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Daltonismo
            </Text>
            <Switch
              value={isDaltonicMode}
              onValueChange={handleDaltonicToggle}
              thumbColor="white"
              trackColor={{ false: "#ccc", true: "rgb(50, 180, 200)" }}
            />
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Idioma */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Idioma
            </Text>
            <Text
              className={`font-bold ${
                isDaltonicMode
                  ? "text-phase2ButtonsDaltonic"
                  : "text-phase2Buttons dark:text-phase2ButtonsDark"
              }`}
            >
              Español
            </Text>
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Cuenta */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Cuenta
            </Text>
            <Text
              className={`font-bold ${
                isDaltonicMode
                  ? "text-phase2ButtonsDaltonic"
                  : "text-phase2Buttons dark:text-phase2ButtonsDark"
              }`}
            >
              Editar mis datos
            </Text>
          </XStack>

          <Separator
            className={`h-1 ${
              isDaltonicMode
                ? "bg-phase2BordersDaltonic"
                : "bg-phase2Borders dark:bg-phase2BordersDark"
            }`}
          />

          {/* Familiares */}
          <XStack className="items-center justify-between">
            <Text
              className={`text-lg ${
                isDaltonicMode
                  ? "text-phase2SmallTxtDaltonic"
                  : "text-phase2Titles dark:text-phase2TitlesDark"
              }`}
            >
              Familia
            </Text>
            <Text
              className={`font-bold ${
                isDaltonicMode
                  ? "text-phase2ButtonsDaltonic"
                  : "text-phase2Buttons dark:text-phase2ButtonsDark"
              }`}
            >
              Editar familiares
            </Text>
          </XStack>
        </YStack>
      </YStack>
    </ScrollView>
  );
}
