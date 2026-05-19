import "../global.css";
import { useState, useEffect } from "react";
import { View, Text, Switch, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import OptionCard from "../components/OptionCard";
import { authFetch } from "../utils/api";
import { API_BASE_URL } from "../utils/config";
import { colors, fonts } from "../utils/theme";

interface Prefs {
  siat_enabled: boolean;
  min_siat_level: number;
  map_events_enabled: boolean;
}

const DEFAULTS: Prefs = {
  siat_enabled: true,
  min_siat_level: 2,
  map_events_enabled: true,
};

const LEVEL_OPTIONS = [
  { label: "Verde",    value: 2, color: colors.brandGreen  },
  { label: "Amarillo", value: 3, color: colors.brandYellow },
  { label: "Naranja",  value: 4, color: colors.brandOrange },
  { label: "Rojo",     value: 5, color: colors.brandRed    },
];

function normalizePrefs(data: Partial<Prefs>): Prefs {
  return {
    siat_enabled:       typeof data.siat_enabled === "boolean"   ? data.siat_enabled       : DEFAULTS.siat_enabled,
    min_siat_level:     typeof data.min_siat_level === "number"  ? data.min_siat_level      : DEFAULTS.min_siat_level,
    map_events_enabled: typeof data.map_events_enabled === "boolean" ? data.map_events_enabled : DEFAULTS.map_events_enabled,
  };
}

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs]   = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/v1/notification-preferences`);
        const data = await res.json();
        if (live) setPrefs(normalizePrefs(data));
      } catch {
        if (live) setFetchError(true);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  async function patchPrefs(update: Partial<Prefs>) {
    if (saving) return;
    const prev = prefs;
    setSaving(true);
    setPrefs(p => ({ ...p, ...update }));
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/notification-preferences`, {
        method: "PATCH",
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error();
    } catch {
      setPrefs(prev);
      Alert.alert("Error", "No se pudo guardar el cambio. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const switchProps = {
    thumbColor: "#fff",
    trackColor: { false: "#9ca3af", true: colors.brandCyan },
    ios_backgroundColor: "#9ca3af",
    disabled: saving,
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ScreenHeader title="Notificaciones" />
        <View style={styles.centered}>
          <View style={styles.glassCard}>
            <ActivityIndicator size="large" color={colors.brandCyan} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
        <ScreenHeader title="Notificaciones" />
        <View style={styles.centered}>
          <View style={styles.glassCard}>
            <Text style={{ color: "white", fontFamily: fonts.poppins, textAlign: "center" }}>
              Error al cargar preferencias. Vuelve a intentarlo.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Notificaciones" />

      <ScrollView className="flex-1 pt-6" showsVerticalScrollIndicator={false}>

        {/* Toggle: Alertas SIAT */}
        <OptionCard
          icon="bell-ring-outline"
          title="Alertas SIAT"
          rightElement={
            <Switch
              value={prefs.siat_enabled}
              onValueChange={v => patchPrefs({ siat_enabled: v })}
              {...switchProps}
            />
          }
        />

        {/* Nivel mínimo — visible solo cuando SIAT está activo */}
        {prefs.siat_enabled && (
          <View style={{ marginHorizontal: 16, marginTop: 8 }}>
            <Text style={styles.sectionLabel}>Nivel mínimo de alerta</Text>
            <View style={{ flexDirection: "row" }}>
              {LEVEL_OPTIONS.map(opt => {
                const isSelected = prefs.min_siat_level === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => patchPrefs({ min_siat_level: opt.value })}
                    disabled={saving}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? opt.color : `${opt.color}4D`,
                        borderWidth: isSelected ? 2 : 0,
                        opacity: saving ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.chipLabel, { color: isSelected ? "#fff" : `${opt.color}CC` }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Toggle: Eventos del mapa */}
        <OptionCard
          icon="map-marker-outline"
          title="Eventos del mapa"
          rightElement={
            <Switch
              value={prefs.map_events_enabled}
              onValueChange={v => patchPrefs({ map_events_enabled: v })}
              {...switchProps}
            />
          }
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  glassCard: {
    backgroundColor: "rgba(10, 28, 50, 0.6)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  sectionLabel: {
    color: "rgba(255,255,255,0.6)",
    fontFamily: fonts.poppins,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderColor: "white",
  },
  chipLabel: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 12,
  },
});
