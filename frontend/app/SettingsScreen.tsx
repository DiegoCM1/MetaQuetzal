import "../global.css";
import { clearOnboardingData } from './onboarding/_services/onboardingService';
import { useState } from "react";
import { Alert, Switch, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { track } from "../utils/analytics";
import { useModel } from "./ai/_context/ModelContext";
import { useAuth } from "../features/auth/AuthContext";
import ScreenHeader from "../components/ScreenHeader";
import OptionCard from "../components/OptionCard";
export default function SettingsScreen() {
  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(false);
  const { modelOptedIn, optIn, optOut, retryDownload, downloadProgress, modelReady, modelError } = useModel();
  const { signOut, deleteAccount } = useAuth();

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro? Esta acción es permanente y no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount()
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la cuenta. Intenta de nuevo.')
            }
          },
        },
      ]
    )
  }

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const showComingSoon = () =>
    Alert.alert("¡Próximamente!", "Esta opción estará disponible muy pronto.");

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
    );
  };

  const handleDeleteModel = () => {
    Alert.alert(
      'Eliminar modelo IA',
      '¿Estás seguro? Tendrás que descargarlo de nuevo para usar el modo sin conexión.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: optOut },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Ajustes" />

      <ScrollView
        className="flex-1 pt-6"
        showsVerticalScrollIndicator={false}
      >

        <OptionCard
          icon="bell-outline"
          title="Notificaciones"
          rightElement={
            <Switch
              value={isNotificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor="#fff"
              trackColor={{ false: "#9ca3af", true: "rgb(60,200,220)" }}
              ios_backgroundColor="#9ca3af"
            />
          }
        />

        <OptionCard icon="account-outline" title="Cuenta" onPress={showComingSoon} />

        <OptionCard icon="restore" title="Reiniciar Onboarding" onPress={handleResetOnboarding} />

        <OptionCard
          icon="alert-outline"
          title="Ver Alerta de Emergencia"
          onPress={() => {
            track('demo_alarm_view');
            router.push('/AlarmScreen');
          }}
        />

        {modelOptedIn && !modelReady && !modelError && (
          <OptionCard
            icon="cloud-download-outline"
            title="Descargando modelo IA..."
            rightElement={
              <Text style={{ color: "white", fontWeight: "600" }}>
                {Math.round(downloadProgress * 100)}%
              </Text>
            }
          />
        )}

        {modelOptedIn && modelError && (
          <OptionCard
            icon="alert-circle-outline"
            title="Error al descargar IA offline — reintentar"
            onPress={retryDownload}
            danger
          />
        )}

        {modelOptedIn && modelReady && (
          <OptionCard
            icon="check-circle-outline"
            title="Modelo IA listo"
            onPress={handleDeleteModel}
            rightElement={
              <MaterialCommunityIcons name="trash-can-outline" color="#EF4444" size={22} />
            }
          />
        )}

        {!modelOptedIn && (
          <OptionCard icon="chip" title="Activar modo sin conexión" onPress={handleDownloadModel} />
        )}

        <OptionCard icon="logout" title="Cerrar sesión" onPress={handleSignOut} danger />
        <OptionCard icon="account-remove-outline" title="Eliminar cuenta" onPress={handleDeleteAccount} danger />

      </ScrollView>

    </SafeAreaView>
  );
}
