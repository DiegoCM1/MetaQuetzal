import "../global.css";
import { clearOnboardingData } from './onboarding/_services/onboardingService';
import { Alert, Text, ScrollView, ActivityIndicator, TextInput, View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { track } from "../utils/analytics";
import { useModel } from "./ai/_context/ModelContext";
import { MODEL_FAILURE_LABEL } from "./ai/_services/modelTelemetry";
import { useAuth } from "../features/auth/AuthContext";
import ScreenHeader from "../components/ScreenHeader";
import OptionCard from "../components/OptionCard";
import { useState } from "react";
import { authFetch } from "../utils/api";
import { API_BASE_URL } from "../utils/config";
import { colors, fonts } from "../utils/theme";
import { toast } from "sonner-native";

export default function SettingsScreen() {
  const router = useRouter();
  const { modelStatus, optIn, optOut, retryDownload, downloadProgress, modelFailure } = useModel();
  const { signOut, deleteAccount } = useAuth();
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const handleSavePhone = async () => {
    const p = phone.trim();
    if (!p || p.length < 5) {
      Alert.alert("Teléfono inválido", "Ingresa un número con al menos 5 dígitos.");
      return;
    }
    setSavingPhone(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/users/me/phone`, {
        method: "PATCH",
        body: JSON.stringify({ phone: p }),
      });
      if (!res.ok) throw new Error();
      toast.success("Teléfono guardado", {
        description: "Los contactos SOS podrán encontrarte por este número.",
      });
    } catch {
      Alert.alert("Error", "No se pudo guardar el teléfono. Intenta de nuevo.");
    } finally {
      setSavingPhone(false);
    }
  };

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
          onPress={() => router.push('/NotificationPreferencesScreen')}
        />

        <OptionCard icon="restore" title="Reiniciar Onboarding" onPress={handleResetOnboarding} />

        {/* Phone for SOS invite lookup */}
        <View style={s.phoneCard}>
          <View style={s.phoneHeader}>
            <MaterialCommunityIcons name="phone-outline" size={22} color={colors.brandCyan} />
            <Text style={s.phoneTitle}>Mi número de teléfono</Text>
          </View>
          <Text style={s.phoneSubtitle}>
            Para recibir invitaciones SOS directamente en la app.
          </Text>
          <View style={s.phoneRow}>
            <TextInput
              style={s.phoneInput}
              placeholder="+52 999 123 4567"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={30}
              editable={!savingPhone}
            />
            <TouchableOpacity
              style={[s.saveBtn, savingPhone && { opacity: 0.6 }]}
              onPress={handleSavePhone}
              disabled={savingPhone}
            >
              {savingPhone
                ? <ActivityIndicator size="small" color="#030810" />
                : <Text style={s.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* AI offline model — one card per lifecycle status (single source of truth). */}
        {modelStatus === 'idle' && (
          <OptionCard icon="chip" title="Activar modo sin conexión" onPress={handleDownloadModel} />
        )}

        {modelStatus === 'checking' && (
          <OptionCard
            icon="cloud-download-outline"
            title="Preparando descarga..."
            rightElement={<ActivityIndicator color="white" />}
          />
        )}

        {modelStatus === 'downloading' && (
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

        {modelStatus === 'reconnecting' && (
          <OptionCard
            icon="autorenew"
            title="Reconectando..."
            subtitle="Conexión interrumpida — reanudando la descarga"
            rightElement={
              <Text style={{ color: "white", fontWeight: "600" }}>
                {Math.round(downloadProgress * 100)}%
              </Text>
            }
          />
        )}

        {modelStatus === 'loading' && (
          <OptionCard
            icon="cog-sync-outline"
            title="Cargando modelo en memoria..."
            rightElement={<ActivityIndicator color="white" />}
          />
        )}

        {modelStatus === 'failed' && modelFailure && (
          <OptionCard
            icon="alert-circle-outline"
            title={`${MODEL_FAILURE_LABEL[modelFailure.type]} — reintentar`}
            subtitle={modelFailure.message}
            onPress={retryDownload}
            danger
          />
        )}

        {modelStatus === 'ready' && (
          <OptionCard
            icon="check-circle-outline"
            title="Modelo IA listo"
            onPress={handleDeleteModel}
            rightElement={
              <MaterialCommunityIcons name="trash-can-outline" color="#EF4444" size={22} />
            }
          />
        )}

        <OptionCard icon="logout" title="Cerrar sesión" onPress={handleSignOut} danger />
        <OptionCard icon="account-remove-outline" title="Eliminar cuenta" onPress={handleDeleteAccount} danger />

      </ScrollView>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  phoneCard: {
    backgroundColor: "rgba(10,28,50,0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  phoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  phoneTitle: {
    color: "white",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
  },
  phoneSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.poppins,
    fontSize: 12,
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "white",
    fontFamily: fonts.poppins,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  saveBtn: {
    backgroundColor: colors.brandCyan,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#030810",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 14,
  },
});
