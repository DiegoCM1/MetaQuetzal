// SettingsScreen.jsx
import "../global.css";
import { useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export default function SettingsScreen() {
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colorScheme, toggleColorScheme } = useColorScheme(); // "light" | "dark"

  /* ──────────────── colour palette (matches MoreScreen) ──────────────── */
  const iconColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#1F2937"; // blue‑ish / gray‑800
  const arrowColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#9CA3AF"; // blue‑ish / gray‑400
  const textColor = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#111827"; // gray‑400 / gray‑900

  /* ──────────────── helpers ──────────────── */
  const showComingSoon = () =>
    Alert.alert("¡Próximamente!", "Esta opción estará disponible muy pronto.");

  const handleDaltonicToggle = () =>
    Alert.alert("¡Próximamente!", "Esta función estará disponible muy pronto.");

  const handleDarkModeToggle = () => toggleColorScheme();

  /** shared row styling */
  const row =
    "flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700";

  /** chevron icon */
  const Chevron = () => (
    <MaterialCommunityIcons name="chevron-right" size={24} color={arrowColor} />
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["left", "right", "bottom"]}
    >
      {/* ───────────────────── NOTIFICACIONES ───────────────────── */}
      <View className={row}>
        <Ionicons
          name="notifications-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Notificaciones
        </Text>
        <Switch
          value={isNotificationsEnabled}
          onValueChange={setNotificationsEnabled}
          thumbColor={colorScheme === "dark" ? "rgb(60,200,220)" : "#fff"}
          trackColor={{ false: "#9ca3af", true: "rgb(60,200,220)" }}
          ios_backgroundColor="#9ca3af"
        />
      </View>

      {/* ─────────────────────── ALARMAS ─────────────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={showComingSoon}
      >
        <Ionicons
          name="alarm-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Alarmas
        </Text>
        <Link href="/AlertDetailsScreen" asChild>
          <Chevron />
        </Link>
      </Pressable>

      {/* ───────────────────── MODO OSCURO ───────────────────── */}
      <View className={row}>
        <Ionicons
          name="moon-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Modo oscuro
        </Text>
        <Switch
          value={colorScheme === "dark"}
          onValueChange={handleDarkModeToggle}
          thumbColor={colorScheme === "dark" ? "rgb(60,200,220)" : "#fff"}
          trackColor={{ false: "#9ca3af", true: "rgb(60,200,220)" }}
          ios_backgroundColor="#9ca3af"
        />
      </View>

      {/* ───────────────────── DALTONISMO ───────────────────── */}
      <View className={row}>
        <Ionicons
          name="eye-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Daltonismo
        </Text>
        <Switch
          value={false}
          onValueChange={handleDaltonicToggle}
          thumbColor={colorScheme === "dark" ? "rgb(60,200,220)" : "#fff"}
          trackColor={{ false: "#9ca3af", true: "rgb(60,200,220)" }}
          ios_backgroundColor="#9ca3af"
        />
      </View>

      {/* ─────────────────────── IDIOMA ─────────────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={showComingSoon}
      >
        <Ionicons
          name="globe-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Idioma
        </Text>
        <Text className="mr-2 text-sm" style={{ color: arrowColor }}>
          Español
        </Text>
        <Chevron />
      </Pressable>

      {/* ─────────────────────── CUENTA ─────────────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={showComingSoon}
      >
        <Ionicons
          name="person-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Cuenta
        </Text>
        <Chevron />
      </Pressable>

      {/* ─────────────────────── FAMILIA ─────────────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={showComingSoon}
      >
        <Ionicons
          name="people-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Familia
        </Text>
        <Chevron />
      </Pressable>
    </SafeAreaView>
  );
}
