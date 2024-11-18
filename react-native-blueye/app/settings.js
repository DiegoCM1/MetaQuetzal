import "../global.css";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, Text, Switch } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-gray-100 p-4">
      <Text className="text-xl font-bold mb-4">Ajustes</Text>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg">Notificaciones</Text>
        <Switch />
      </View>
      <View className="flex-row justify-between items-center">
        <Text className="text-lg">Modo oscuro</Text>
        <Switch />
      </View>
    </View>
  );
}
