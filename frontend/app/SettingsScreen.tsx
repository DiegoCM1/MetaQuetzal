import "../global.css";
import { clearOnboardingData } from './onboarding/_services/onboardingService';
import { Alert, Text, ScrollView, ActivityIndicator, View, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useModel } from "./ai/_context/ModelContext";
import { MODEL_FAILURE_LABEL } from "./ai/_services/modelTelemetry";
import { useAuth } from "../features/auth/AuthContext";
import ScreenHeader from "../components/ScreenHeader";
import OptionCard from "../components/OptionCard";
import { authFetch } from "../utils/api";
import { API_BASE_URL } from "../utils/config";

export default function SettingsScreen() {
  const router = useRouter();
  const { modelStatus, optIn, optOut, retryDownload, downloadProgress, modelFailure } = useModel();
  const { signOut, deleteAccount } = useAuth();

  const [phone, setPhone]             = useState<string>("");
  const [phoneInput, setPhoneInput]   = useState<string>("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/v1/users/me`)
      .then(r => r.json())
      .then(data => {
        const p: string = data?.phone ?? "";
        setPhone(p);
        setPhoneInput(p);
      })
      .catch(() => {});
  }, []);

  async function handleSavePhone() {
    const trimmed = phoneInput.trim();
    if (!trimmed) {
      Alert.alert("Error", "Ingresa un número de teléfono válido.");
      return;
    }
    setSavingPhone(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/users/me/phone`, {
        method: "PATCH",
        body: JSON.stringify({ phone: trimmed }),
      });
      if (res.ok) {
        setPhone(trimmed);
        setEditingPhone(false);
        Alert.alert("Listo", "Tu número se guardó. Tus contactos SOS podrán llamarte cuando reciban una alerta.");
      } else {
        Alert.alert("Error", "No se pudo guardar el número. Intenta de nuevo.");
      }
    } catch {
      Alert.alert("Error", "Sin conexión. Intenta de nuevo.");
    } finally {
      setSavingPhone(false);
    }
  }

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

        {/* Phone number for SOS call-back */}
        <OptionCard
          icon="phone-outline"
          title="Mi número de teléfono"
          subtitle={phone ? phone : "Sin número — tus contactos no podrán llamarte"}
          onPress={() => {
            setPhoneInput(phone);
            setEditingPhone(v => !v);
          }}
        />
        {editingPhone && (
          <View style={st.phoneRow}>
            <TextInput
              style={st.phoneInput}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+52 55 1234 5678"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="phone-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSavePhone}
            />
            <View style={st.phoneActions}>
              <Text
                style={[st.phoneBtn, st.phoneBtnCancel]}
                onPress={() => setEditingPhone(false)}
              >
                Cancelar
              </Text>
              {savingPhone ? (
                <ActivityIndicator color="white" style={{ marginLeft: 16 }} />
              ) : (
                <Text style={[st.phoneBtn, st.phoneBtnSave]} onPress={handleSavePhone}>
                  Guardar
                </Text>
              )}
            </View>
          </View>
        )}

        <OptionCard icon="restore" title="Reiniciar Onboarding" onPress={handleResetOnboarding} />

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

const st = StyleSheet.create({
  phoneRow: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  phoneInput: {
    color: "white",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
    paddingBottom: 6,
  },
  phoneActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 4,
  },
  phoneBtn: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
  },
  phoneBtnCancel: {
    color: "rgba(255,255,255,0.45)",
  },
  phoneBtnSave: {
    color: "white",
    fontFamily: "Poppins_600SemiBold",
    backgroundColor: "rgba(0, 196, 203, 0.15)",
  },
});
