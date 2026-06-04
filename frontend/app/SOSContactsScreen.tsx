import "../global.css";
import { useState, useEffect } from "react";
import {
  View, Text, FlatList, Modal, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenHeader from "../components/ScreenHeader";
import { authFetch } from "../utils/api";
import { API_BASE_URL } from "../utils/config";
import { colors, fonts } from "../utils/theme";

interface SOSContact {
  id: number; user_id: number; name: string; phone: string;
  relationship: string | null; created_at: string; updated_at: string;
}

export default function SOSContactsScreen() {
  const [contacts, setContacts]             = useState<SOSContact[]>([]);
  const [loading, setLoading]               = useState(true);
  const [fetchError, setFetchError]         = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [editingContact, setEditingContact] = useState<SOSContact | null>(null);
  const [nameVal, setNameVal]               = useState("");
  const [phoneVal, setPhoneVal]             = useState("");
  const [relVal, setRelVal]                 = useState("");
  const [formError, setFormError]           = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    authFetch(`${API_BASE_URL}/api/v1/sos-contacts`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: SOSContact[]) => { if (live) setContacts(data); })
      .catch(() => { if (live) setFetchError(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  function openCreate() {
    setEditingContact(null); setNameVal(""); setPhoneVal(""); setRelVal("");
    setFormError(null); setModalVisible(true);
  }
  function openEdit(c: SOSContact) {
    setEditingContact(c); setNameVal(c.name); setPhoneVal(c.phone);
    setRelVal(c.relationship ?? ""); setFormError(null); setModalVisible(true);
  }
  function closeModal() { setModalVisible(false); setFormError(null); }

  async function handleSave() {
    const n = nameVal.trim(), p = phoneVal.trim(), r = relVal.trim();
    if (!n || !p) return setFormError("Nombre y teléfono son obligatorios.");
    if (p.length < 5) return setFormError("El teléfono debe tener al menos 5 caracteres.");

    setSaving(true); setFormError(null);
    const body = { name: n, phone: p, ...(r ? { relationship: r } : {}) };
    try {
      const url = editingContact
        ? `${API_BASE_URL}/api/v1/sos-contacts/${editingContact.id}`
        : `${API_BASE_URL}/api/v1/sos-contacts`;
      const method = editingContact ? "PATCH" : "POST";
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const saved: SOSContact = await res.json();
      setContacts(prev =>
        editingContact ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved]
      );
      closeModal();
    } catch {
      setFormError("No se pudo guardar el contacto. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(c: SOSContact) {
    Alert.alert("Eliminar contacto", `¿Eliminar a ${c.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => handleDelete(c) },
    ]);
  }

  async function handleDelete(c: SOSContact) {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/sos-contacts/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setContacts(prev => prev.filter(x => x.id !== c.id));
    } catch {
      Alert.alert("Error", "No se pudo eliminar el contacto. Intenta de nuevo.");
    }
  }

  if (loading) return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Contactos SOS" />
      <View style={s.centered}><View style={s.card}>
        <ActivityIndicator size="large" color={colors.brandCyan} />
      </View></View>
    </SafeAreaView>
  );

  if (fetchError) return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Contactos SOS" />
      <View style={s.centered}><View style={s.card}>
        <Text style={s.bodyText}>Error al cargar contactos. Intenta de nuevo.</Text>
      </View></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Contactos SOS" />

      {contacts.length === 0 ? (
        <View style={s.centered}><View style={s.card}>
          <MaterialCommunityIcons name="account-heart-outline" size={48} color={colors.brandCyan} />
          <Text style={[s.title, { marginTop: 12, marginBottom: 6 }]}>Sin contactos SOS</Text>
          <Text style={[s.bodyText, { textAlign: "center", marginBottom: 20 }]}>
            Agrega personas de confianza que recibirán tu alerta en caso de emergencia.
          </Text>
          <TouchableOpacity style={s.cyanButton} onPress={openCreate}>
            <Text style={s.cyanButtonText}>Agregar contacto</Text>
          </TouchableOpacity>
        </View></View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={contacts}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
            renderItem={({ item }) => (
              <View style={s.contactRow}>
                <MaterialCommunityIcons name="account-circle-outline" size={36} color={colors.brandCyan} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.contactName}>{item.name}</Text>
                  <Text style={s.contactPhone}>{item.phone}</Text>
                  {item.relationship
                    ? <Text style={s.contactRel}>{item.relationship}</Text>
                    : null}
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8} accessibilityLabel="Editar">
                    <MaterialCommunityIcons name="pencil-outline" size={22} color="rgba(255,255,255,0.55)" />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8} accessibilityLabel="Eliminar">
                    <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.brandRed} />
                  </Pressable>
                </View>
              </View>
            )}
          />
          <Pressable style={s.fab} onPress={openCreate} accessibilityLabel="Agregar contacto">
            <MaterialCommunityIcons name="plus" size={28} color="white" />
          </Pressable>
        </View>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={s.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {editingContact ? "Editar contacto" : "Nuevo contacto SOS"}
            </Text>

            <Text style={s.inputLabel}>Nombre *</Text>
            <TextInput style={s.input} placeholder="Ej. Mamá"
              placeholderTextColor="rgba(255,255,255,0.3)" value={nameVal} maxLength={100}
              onChangeText={v => { setNameVal(v); setFormError(null); }} autoCapitalize="words" />

            <Text style={s.inputLabel}>Teléfono *</Text>
            <TextInput style={s.input} placeholder="Ej. +52 999 123 4567"
              placeholderTextColor="rgba(255,255,255,0.3)" value={phoneVal} maxLength={30}
              onChangeText={v => { setPhoneVal(v); setFormError(null); }} keyboardType="phone-pad" />

            <Text style={s.inputLabel}>Relación (opcional)</Text>
            <TextInput style={s.input} placeholder="Ej. Madre, Hermano…"
              placeholderTextColor="rgba(255,255,255,0.3)" value={relVal} maxLength={60}
              onChangeText={v => { setRelVal(v); setFormError(null); }} autoCapitalize="sentences" />

            {formError ? <Text style={s.formError}>{formError}</Text> : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <TouchableOpacity style={s.cancelButton} onPress={closeModal} disabled={saving}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cyanButton, { flex: 1, opacity: saving ? 0.6 : 1 }]}
                onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#030810" />
                  : <Text style={s.cyanButtonText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  centered:     { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  card:         { backgroundColor: "rgba(10,28,50,0.6)", borderRadius: 16, borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)", padding: 24, width: "100%", alignItems: "center" },
  title:        { color: "white", fontFamily: fonts.poppinsSemiBold, fontSize: 17 },
  bodyText:     { color: "rgba(255,255,255,0.55)", fontFamily: fonts.poppins, fontSize: 13, lineHeight: 20 },
  cyanButton:   { backgroundColor: colors.brandCyan, borderRadius: 12,
                  paddingVertical: 13, paddingHorizontal: 24, alignItems: "center" },
  cyanButtonText: { color: "#030810", fontFamily: fonts.poppinsSemiBold, fontSize: 15 },
  contactRow:   { backgroundColor: "rgba(10,28,50,0.6)", borderRadius: 14, borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)", marginHorizontal: 16, marginBottom: 10,
                  padding: 14, flexDirection: "row", alignItems: "center" },
  contactName:  { color: "white", fontFamily: fonts.poppinsSemiBold, fontSize: 15 },
  contactPhone: { color: "rgba(255,255,255,0.6)", fontFamily: fonts.poppins, fontSize: 13, marginTop: 2 },
  contactRel:   { color: colors.brandCyan, fontFamily: fonts.poppins, fontSize: 12, marginTop: 2 },
  fab:          { position: "absolute", bottom: 24, right: 24, backgroundColor: colors.brandCyan,
                  width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center",
                  elevation: 8, shadowColor: colors.brandCyan, shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 8 },
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalCard:    { backgroundColor: "#0c2438", borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 24, paddingBottom: 36 },
  modalTitle:   { color: "white", fontFamily: fonts.poppinsSemiBold, fontSize: 18,
                  marginBottom: 20, textAlign: "center" },
  inputLabel:   { color: "rgba(255,255,255,0.5)", fontFamily: fonts.poppins, fontSize: 11,
                  letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  input:        { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10, borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)", color: "white", fontFamily: fonts.poppins,
                  fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  formError:    { color: colors.brandRed, fontFamily: fonts.poppins, fontSize: 13,
                  marginBottom: 12, textAlign: "center" },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
                  borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelText:   { color: "rgba(255,255,255,0.7)", fontFamily: fonts.poppinsSemiBold, fontSize: 15 },
});
