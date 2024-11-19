// index.js
import "../global.css";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from '@tamagui/core';  // Importa TamaguiProvider
import config from '../tamagui.config';  // Importa la configuración de Tamagui
import Main from '../components/Main';  // Importa el componente Main

const App = () => {
  return (
    <TamaguiProvider config={config}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Main />
      </SafeAreaProvider>
    </TamaguiProvider>
  );
};

export default App;
