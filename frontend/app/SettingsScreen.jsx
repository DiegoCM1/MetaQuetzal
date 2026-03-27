// SettingsScreen.jsx
import "../global.css";
import { clearOnboardingData } from './onboarding/_services/onboardingService';
import { useState, useEffect } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { track } from "../utils/analytics";
import * as FileSystem from 'expo-file-system'
import { MODEL_PATH } from './ai/_constants'



export default function SettingsScreen() {
  // DOWNLOADS
  const MODEL_URL = 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf'

  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colorScheme, toggleColorScheme } = useTheme(); // Using ThemeContext with persistence
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isModelInstalled, setIsModelInstalled] = useState(false)

  useEffect(() => {
    FileSystem.getInfoAsync(MODEL_PATH).then(info => {
      const isComplete = info.exists && info.size && info.size > 700 * 1024 * 1024
      console.log('Model check on mount — exists:', info.exists, 'size:', info.size, 'complete:', isComplete)
      setIsModelInstalled(!!isComplete)
    })
  }, [])

  /* ──────────────── colour palette (matches MoreScreen) ──────────────── */
  const iconColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#1F2937"; // blue‑ish / gray‑800
  const arrowColor = colorScheme === "dark" ? "rgb(60, 200, 220)" : "#9CA3AF"; // blue‑ish / gray‑400
  const textColor = colorScheme === "dark" ? "rgb(230, 230, 250)" : "#111827"; // gray‑400 / gray‑900

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

  /** shared row styling */
  const row =
    "flex-row items-center px-5 py-3 border-b border-gray-200 dark:border-neutral-700";

  /** chevron icon */
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

  const handleDownloadModel = async () => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH)

      // Check file size — partial downloads (< 100MB) are treated as incomplete
      if (info.exists && info.size && info.size > 700 * 1024 * 1024) {
        Alert.alert("No need to install again", "Already installed")
        console.log("AI already on device, size:", info.size)
        return
      }

      // Delete partial file if it exists
      if (info.exists) {
        console.log('Deleting partial file, size was:', info.size)
        await FileSystem.deleteAsync(MODEL_PATH)
        setIsModelInstalled(false)
      }

      Alert.alert('Wait for it to install', 'Download started')
      console.log('Starting download to:', MODEL_PATH)

      let lastPercent = -1
      const downloadResumable = FileSystem.createDownloadResumable(
        MODEL_URL,
        MODEL_PATH,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          const progress = totalBytesWritten / totalBytesExpectedToWrite
          setDownloadProgress(progress)
          const percent = Math.round(progress * 100)
          if (percent !== lastPercent) {
            console.log('Progress:', percent + '%')
            lastPercent = percent
          }
        }
      )
      await downloadResumable.downloadAsync()

      // Verify the downloaded file is complete
      const finalInfo = await FileSystem.getInfoAsync(MODEL_PATH)
      console.log('Download complete, file size:', finalInfo.size)

      Alert.alert('Now you can chat offline', 'AI Installed')
      setIsModelInstalled(true)

    } catch (error) {
      // Clean up partial file on error
      const partial = await FileSystem.getInfoAsync(MODEL_PATH)
      if (partial.exists) {
        await FileSystem.deleteAsync(MODEL_PATH)
        console.log('Cleaned up partial file')
      }
      Alert.alert('Please try again', 'There was an error installing the AI')
      console.log('Download error:', error.message, error)
    }
  }

  const handleDeleteModel = async () => {
    await FileSystem.deleteAsync(MODEL_PATH)
    setIsModelInstalled(false)
    console.log('Model deleted from device')
  }


  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["bottom"]}
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

      {isModelInstalled ? (
        <Pressable className={row} onPress={handleDeleteModel}>
          <Ionicons name="checkmark-circle-outline" color="green" size={22} style={{ marginRight: 16 }} />
          <Text className="flex-1 text-base" style={{ color: textColor }}>
            Modelo IA instalado
          </Text>
          <Ionicons name="trash-outline" color="#EF4444" size={22} />
        </Pressable>
      ) : (
        <Pressable
          android_ripple={{ color: "rgba(0,0,0,0.07)" }}
          className={row}
          onPress={handleDownloadModel}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={22}
            color={iconColor}
            style={{ marginRight: 16 }}
          />
          <Text className="flex-1 text-base" style={{ color: textColor }}>
            Descargar modelo IA
          </Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <Text style={{ color: arrowColor }}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          )}
          <Chevron />
        </Pressable>
      )}


    </SafeAreaView>
  );
}
