import "../../global.css";
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, ScrollView, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../../components/ScreenHeader";
import { authFetch } from "../../utils/api";
import { API_BASE_URL } from "../../utils/config";
import { colors, fonts } from "../../utils/theme";
import { toast } from "sonner-native";

interface UserProfile {
  display_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE_URL}/api/v1/users/me`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: UserProfile) => {
        setProfile(data);
        setPhone(data.phone ?? "");
      })
      .catch(() => Alert.alert("Error", "No se pudo cargar el perfil."))
      .finally(() => setLoading(false));
  }, []);

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
      setProfile(prev => prev ? { ...prev, phone: p } : prev);
      toast.success("Teléfono guardado", {
        description: "Los contactos SOS podrán encontrarte por este número.",
      });
    } catch {
      Alert.alert("Error", "No se pudo guardar el teléfono. Intenta de nuevo.");
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Mi Perfil" />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.brandCyan} />
        </View>
      ) : (
        <ScrollView className="flex-1 pt-6" showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.avatarRow}>
              <MaterialCommunityIcons name="account-circle" size={64} color={colors.brandCyan} />
            </View>

            <Field
              icon="account-outline"
              label="Nombre"
              value={profile?.display_name ?? "—"}
            />
            <Field
              icon="email-outline"
              label="Correo"
              value={profile?.email ?? "—"}
            />
            <Field
              icon="calendar-outline"
              label="Miembro desde"
              value={profile?.created_at ? formatDate(profile.created_at) : "—"}
            />
          </View>

          <View style={s.card}>
            <View style={s.sectionHeader}>
              <MaterialCommunityIcons name="phone-outline" size={20} color={colors.brandCyan} />
              <Text style={s.sectionTitle}>Número de teléfono</Text>
            </View>
            <Text style={s.sectionSub}>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Field({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.fieldRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color="rgba(255,255,255,0.45)" style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={s.fieldLabel}>{label}</Text>
        <Text style={s.fieldValue}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "rgba(10,28,50,0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  avatarRow: { alignItems: "center", marginBottom: 20 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  fieldLabel: {
    color: "rgba(255,255,255,0.45)",
    fontFamily: fonts.poppins,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  fieldValue: { color: "white", fontFamily: fonts.poppinsSemiBold, fontSize: 15 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  sectionTitle: { color: "white", fontFamily: fonts.poppinsSemiBold, fontSize: 15 },
  sectionSub: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.poppins,
    fontSize: 12,
    marginBottom: 14,
  },
  phoneRow: { flexDirection: "row", gap: 10 },
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
  saveBtnText: { color: "#030810", fontFamily: fonts.poppinsSemiBold, fontSize: 14 },
});
