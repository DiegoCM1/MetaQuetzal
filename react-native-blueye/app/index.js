// index.js
import "../global.css";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, AppRegistry } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from '@tamagui/core';  // Importa TamaguiProvider
import config from '../tamagui.config';  // Importa la configuración de Tamagui
import Main from '../components/Main';  // Importa el componente Main

const App = () => {
  return (
    <TamaguiProvider config={config}>  // Envwuelve tu aplicación con TamaguiProvider
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Main />
        </View>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
};

AppRegistry.registerComponent('YourAppName', () => App);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
