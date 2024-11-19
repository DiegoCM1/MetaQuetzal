import React from 'react';
import { TamaguiProvider } from '@tamagui/core'; // Asegúrate de importar esto
import config from '../tamagui.config'; // Importa la configuración de Tamagui
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Settings from '../app/settings';
import Monetization from '../app/monetization';
import ChatAI from '../app/chat-ai';
import Main from '../app/index';

const Stack = createStackNavigator();

const MainComponent = () => {
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

export default MainComponent;