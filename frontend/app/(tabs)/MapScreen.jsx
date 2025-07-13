// index.js
import "../../global.css";
import { StatusBar } from "expo-status-bar";
import { TamaguiProvider } from "@tamagui/core"; // Importa TamaguiProvider
import config from "../../tamagui.config"; // Importa la configuración de Tamagui
import Main from "../../components/Main"; // Importa el componente Main

const MapScreen = () => {
  return (
    <TamaguiProvider config={config}>
      <StatusBar style="light" />
      <Main />
    </TamaguiProvider>
  );
};

export default MapScreen;
