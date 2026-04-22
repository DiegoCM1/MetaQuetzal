// SettingsScreen.jsx
import "../global.css";
import { clearOnboardingData } from './onboarding/_services/onboardingService';
import { useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { track } from "../utils/analytics";
import { useModel } from "./ai/_context/ModelContext";
import { useAuth } from "./(auth)/_context/AuthContext";
import  ScreenHeader from "../components/ScreenHeader"


export default function SettingsScreen() {

  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colorScheme, toggleColorScheme } = useTheme();
  const { modelOptedIn, optIn, optOut, retryDownload, downloadProgress, modelReady, modelError } = useModel()
  const { signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ]
    )
  }

  /* ──────────────── colour palette (matches MoreScreen) ──────────────── */
  const iconColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#1F2937";
  const arrowColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#9CA3AF";
  const textColor = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#111827";

  /* ──────────────── helpers ──────────────── */
  const showComingSoon = () =>
    Alert.alert("¡Próximamente!", "Esta opción estará disponible muy pronto.");

  const handleDaltonicToggle = () =>
    Alert.alert("¡Próximamente!", "Esta función estará disponible muy pronto.");

  const handleDarkModeToggle = () => {
    const newTheme = colorScheme === "dark" ? "light" : "dark";
    toggleColorScheme();
    track("theme_change", { theme: newTheme });
  };

  const row =
    "flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700";

  const Chevron = () => (
    <MaterialCommunityIcons name="chevron-right" size={24} color={arrowColor} />
  );

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reiniciar Onboarding',
      '¿Estás seguro? Esto borrará tus datos y mostrará el wizard de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: async () => {
            await clearOnboardingData();
            router.replace('/onboarding/step1');
          },
        },
      ]
    );
  };

  const handleDownloadModel = () => {
    Alert.alert(
      'Descargar modelo IA',
      'El modelo se descargará en segundo plano. Puedes seguir usando la app mientras tanto.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descargar', onPress: optIn },
      ]
    )
  }

  const handleDeleteModel = () => {
    Alert.alert(
      'Eliminar modelo IA',
      '¿Estás seguro? Tendrás que descargarlo de nuevo para usar el modo sin conexión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: optOut },
      ]
    )
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["top", "bottom"]}
    >

      <ScreenHeader title="Ajustes" />


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
        <Link href="/alerts" asChild>
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

      {/* ────────────── REINICIAR ONBOARDING (DEV) ────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={handleResetOnboarding}
      >
        <Ionicons
          name="refresh-outline"
          size={22}
          color={iconColor}
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Reiniciar Onboarding
        </Text>
        <Chevron />
      </Pressable>

      {/* ────────────── VER ALERTA DE EMERGENCIA (DEMO) ────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(0,0,0,0.07)" }}
        className={row}
        onPress={() => {
          track('demo_alarm_view');
          router.push('/AlarmScreen');
        }}
      >
        <Ionicons
          name="warning-outline"
          size={22}
          color="#EF4444"
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: textColor }}>
          Ver Alerta de Emergencia
        </Text>
        <Chevron />
      </Pressable>

      {/* ────────────── MODELO IA ────────────── */}
      {modelOptedIn && !modelReady && !modelError && (
        <View className={`${row} flex-col items-start gap-2`}>
          <View className="flex-row items-center w-full">
            <Ionicons name="cloud-download-outline" size={22} color={iconColor} style={{ marginRight: 16 }} />
            <Text className="flex-1 text-base" style={{ color: textColor }}>
              Descargando modelo IA... {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
          <View className="w-full h-1.5 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden ml-10">
            <View
              className="h-full bg-phase2Buttons rounded-full"
              style={{ width: `${Math.round(downloadProgress * 100)}%` }}
            />
          </View>
        </View>
      )}

      {modelOptedIn && modelError && (
        <Pressable className={row} onPress={retryDownload}>
          <Ionicons name="alert-circle-outline" size={22} color="#EF4444" style={{ marginRight: 16 }} />
          <Text className="flex-1 text-base" style={{ color: "#EF4444" }}>
            Error al descargar IA offline — reintentar
          </Text>
        </Pressable>
      )}

      {modelOptedIn && modelReady && (
        <Pressable className={row} onPress={handleDeleteModel}>
          <Ionicons name="checkmark-circle-outline" color="green" size={22} style={{ marginRight: 16 }} />
          <Text className="flex-1 text-base" style={{ color: textColor }}>
            Modelo IA listo
          </Text>
          <Ionicons name="trash-outline" color="#EF4444" size={22} />
        </Pressable>
      )}

      {!modelOptedIn && (
        <Pressable
          android_ripple={{ color: "rgba(0,0,0,0.07)" }}
          className={row}
          onPress={handleDownloadModel}
        >
          <Ionicons name="hardware-chip-outline" size={22} color={iconColor} style={{ marginRight: 16 }} />
          <Text className="flex-1 text-base" style={{ color: textColor }}>
            Activar modo sin conexión
          </Text>
          <Chevron />
        </Pressable>
      )}

      {/* ────────────── CERRAR SESIÓN ────────────── */}
      <Pressable
        android_ripple={{ color: "rgba(239,68,68,0.1)" }}
        className={row}
        onPress={handleSignOut}
      >
        <Ionicons
          name="log-out-outline"
          size={22}
          color="#EF4444"
          style={{ marginRight: 16 }}
        />
        <Text className="flex-1 text-base" style={{ color: "#EF4444" }}>
          Cerrar sesión
        </Text>
      </Pressable>

    </SafeAreaView>
  );
}
