// Main.jsx
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Button, Card } from 'tamagui'; // Importa lo que uses de Tamagui
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native'; // Asegúrate de importar correctamente NavigationContainer
import { createStackNavigator } from '@react-navigation/stack'; // Asegúrate de importar Stack
import Settings from '../app/settings'; // Cambié la importación a settings.js
import Monetization from '../app/monetization'; // Cambié la importación a monetization.js
import ChatAI from '../app/chat-ai'; // Cambié la importación a chat-ai.js
import Main from '../app/index'; // Cambié la importación a main.js

const Stack = createStackNavigator();

const MainComponent = () => {
  const insets = useSafeAreaInsets();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Settings">
        <Stack.Screen name="Settings" component={Settings} options={{ title: 'Ajustes' }} />
        <Stack.Screen name="Subscription" component={Monetization} options={{ title: 'Suscripción' }} />
        <Stack.Screen name="Chat" component={ChatAI} options={{ title: 'Chat' }} />
        <Stack.Screen name="Map" component={Main} options={{ title: 'Mapa' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007bff',
    color: '#fff',
    borderRadius: 5,
  },
});

export default Main;
