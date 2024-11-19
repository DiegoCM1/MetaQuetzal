import "../global.css";
import React from "react";
import { TamaguiProvider } from "@tamagui/core";  // Importa TamaguiProvider
import config from "../tamagui.config";  // Importa la configuración de Tamagui
import { Stack, Text, Switch } from "@tamagui/core"; // Solo los componentes esenciales

export default function SettingsScreen() {
  return (
    <TamaguiProvider config={config}>  {/* TamaguiProvider envolviendo el componente */}
      <Stack flex={1} backgroundColor="$background">
        <Text fontWeight="700">Ajustes</Text>
      </Stack>

      <Stack flex={1} backgroundColor="$background">
        <Text fontWeight="700" className="bg-slate-400">Ajustes</Text>
      </Stack>
    </TamaguiProvider>
  );
}
