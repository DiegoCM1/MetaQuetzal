import "../global.css";
import { useState } from "react";
import { ScrollView, Text, Switch, Pressable, Alert, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const showComingSoon = () =>
    Alert.alert("¡Próximamente!", "Esta opción estará disponible muy pronto.");

  const handleDaltonicToggle = () =>
    Alert.alert("¡Próximamente!", "Esta función estará disponible muy pronto.");

  const handleDarkModeToggle = () => toggleColorScheme();

  /** Shared row style (matches “More” screen) */
  const row =
    "flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700";

  /** Chevron used on rows without a Switch */
  const Chevron = () => (
    <MaterialCommunityIcons
      name="chevron-right"
      size={24}
      className="text-gray-400 dark:text-gray-500"
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900">
        {/* ──────────────────────── NOTIFICACIONES ──────────────────────── */}
        <View className={row}>
          <Ionicons
            name="notifications-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Notificaciones
          </Text>
          <Switch
            value={isNotificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={colorScheme === "dark" ? "#111" : "#fff"}
            trackColor={{ false: "#9ca3af", true: "rgb(50,180,200)" }}
            ios_backgroundColor="#9ca3af"
          />
        </View>

        {/* ──────────────────────── ALARMAS ──────────────────────── */}
        <Pressable
          android_ripple={{ color: "#e5e7eb" }}
          className={row}
          onPress={() => {
            showComingSoon;
          }}
        >
          <Ionicons
            name="alarm-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Alarmas
          </Text>
          <Link href="/AlertDetailsScreen" asChild>
            <Chevron />
          </Link>
        </Pressable>

        {/* ──────────────────────── MODO OSCURO ──────────────────────── */}
        <View className={row}>
          <Ionicons
            name="moon-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Modo oscuro
          </Text>
          <Switch
            value={colorScheme === "dark"}
            onValueChange={handleDarkModeToggle}
            thumbColor={colorScheme === "dark" ? "#111" : "#fff"}
            trackColor={{ false: "#9ca3af", true: "rgb(50,180,200)" }}
            ios_backgroundColor="#9ca3af"
          />
        </View>

        {/* ──────────────────────── DALTONISMO ──────────────────────── */}
        <View className={row}>
          <Ionicons
            name="eye-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Daltonismo
          </Text>
          <Switch
            value={false}
            onValueChange={showComingSoon}
            thumbColor={colorScheme === "dark" ? "#111" : "#fff"}
            trackColor={{ false: "#9ca3af", true: "rgb(50,180,200)" }}
            ios_backgroundColor="#9ca3af"
          />
        </View>

        {/* ──────────────────────── IDIOMA ──────────────────────── */}
        <Pressable
          android_ripple={{ color: "#e5e7eb" }}
          className={row}
          onPress={showComingSoon}
        >
          <Ionicons
            name="globe-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Idioma
          </Text>
          <Text className="mr-2 text-sm text-gray-500 dark:text-gray-400">
            Español
          </Text>
          <Chevron />
        </Pressable>

        {/* ──────────────────────── CUENTA ──────────────────────── */}
        <Pressable
          android_ripple={{ color: "#e5e7eb" }}
          className={row}
          onPress={showComingSoon}
        >
          <Ionicons
            name="person-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Cuenta
          </Text>
          <Chevron />
        </Pressable>

        {/* ──────────────────────── FAMILIA ──────────────────────── */}
        <Pressable
          android_ripple={{ color: "#e5e7eb" }}
          className={row}
          onPress={showComingSoon}
        >
          <Ionicons
            name="people-outline"
            size={22}
            className="mr-4 text-gray-700 dark:text-gray-200"
          />
          <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">
            Familia
          </Text>
          <Chevron />
        </Pressable>
    </SafeAreaView>
  );
}
