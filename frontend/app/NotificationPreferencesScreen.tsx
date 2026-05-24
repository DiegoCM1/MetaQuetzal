import "../global.css";
import { useState, useEffect } from "react";
import { View, Text, Switch, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import ScreenHeader from "../components/ScreenHeader";
import OptionCard from "../components/OptionCard";
import { authFetch } from "../utils/api";
import { API_BASE_URL } from "../utils/config";
import { colors, fonts } from "../utils/theme";

interface Prefs {
  siat_enabled: boolean;
  min_siat_level: number;
  map_events_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
}

const DEFAULTS: Prefs = {
  siat_enabled: true,
  min_siat_level: 2,
  map_events_enabled: true,
  quiet_hours_enabled: false,
  quiet_start: null,
  quiet_end: null,
};

const LEVEL_OPTIONS = [
  { label: "Verde",    value: 2, color: colors.brandGreen  },
  { label: "Amarillo", value: 3, color: colors.brandYellow },
  { label: "Naranja",  value: 4, color: colors.brandOrange },
  { label: "Rojo",     value: 5, color: colors.brandRed    },
];

function normalizePrefs(data: Partial<Prefs>): Prefs {
  return {
    siat_enabled:        typeof data.siat_enabled === "boolean"        ? data.siat_enabled        : DEFAULTS.siat_enabled,
    min_siat_level:      typeof data.min_siat_level === "number"       ? data.min_siat_level       : DEFAULTS.min_siat_level,
    map_events_enabled:  typeof data.map_events_enabled === "boolean"  ? data.map_events_enabled   : DEFAULTS.map_events_enabled,
    quiet_hours_enabled: typeof data.quiet_hours_enabled === "boolean" ? data.quiet_hours_enabled  : DEFAULTS.quiet_hours_enabled,
    quiet_start: typeof data.quiet_start === "string" ? data.quiet_start : DEFAULTS.quiet_start,
    quiet_end:   typeof data.quiet_end   === "string" ? data.quiet_end   : DEFAULTS.quiet_end,
  };
}

function localTimeToUTC(localStr: string): string {
  const [h, m] = localStr.split(":").map(Number);
  const offset = new Date().getTimezoneOffset(); // (UTC - local) in minutes
  const utcMin = (h * 60 + m + offset + 1440) % 1440;
  return `${String(Math.floor(utcMin / 60)).padStart(2, "0")}:${String(utcMin % 60).padStart(2, "0")}`;
}

function utcTimeToLocal(utcStr: string): string {
  const [h, m] = utcStr.split(":").map(Number);
  const offset = new Date().getTimezoneOffset();
  const locMin = (h * 60 + m - offset + 1440) % 1440;
  return `${String(Math.floor(locMin / 60)).padStart(2, "0")}:${String(locMin % 60).padStart(2, "0")}`;
}

function timeStrToDate(s: string | null): Date {
  // s is stored in UTC; convert to local for the picker
  const local = utcTimeToLocal(s ?? "22:00");
  const [h, m] = local.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeStr(d: Date): string {
  // picker returns local time; convert to UTC before storing/sending
  const local = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return localTimeToUTC(local);
}

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs]       = useState<Prefs>(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);

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

  function handleQuietToggle(enabled: boolean) {
    if (enabled && (!prefs.quiet_start || !prefs.quiet_end)) {
      patchPrefs({
        quiet_hours_enabled: true,
        quiet_start: localTimeToUTC("22:00"),
        quiet_end: localTimeToUTC("07:00"),
      });
    } else {
      patchPrefs({ quiet_hours_enabled: enabled });
    }
  }

  function handleStartChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShowStartPicker(false);
    if (date) patchPrefs({ quiet_start: dateToTimeStr(date) });
  }

  function handleEndChange(_event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShowEndPicker(false);
    if (date) patchPrefs({ quiet_end: dateToTimeStr(date) });
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

        {/* Toggle: No molestar */}
        <OptionCard
          icon="moon-waning-crescent"
          title="No molestar"
          rightElement={
            <Switch
              value={prefs.quiet_hours_enabled}
              onValueChange={handleQuietToggle}
              {...switchProps}
            />
          }
        />

        {/* Selector de horario — visible solo cuando quiet hours está activo */}
        {prefs.quiet_hours_enabled && (
          <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
            <Text style={styles.sectionLabel}>Horario sin alertas</Text>
            <Text style={styles.utcNote}>Las alertas nivel 4-5 / Naranja-Rojo siempre se envían.</Text>

            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Inicio</Text>
                <TouchableOpacity
                  style={[styles.timeButton, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.timeValue}>{utcTimeToLocal(prefs.quiet_start ?? "22:00")}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.timeSeparator}>→</Text>

              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Fin</Text>
                <TouchableOpacity
                  style={[styles.timeButton, saving && { opacity: 0.6 }]}
                  disabled={saving}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.timeValue}>{utcTimeToLocal(prefs.quiet_end ?? "07:00")}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                mode="time"
                value={timeStrToDate(prefs.quiet_start)}
                is24Hour
                onChange={handleStartChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                mode="time"
                value={timeStrToDate(prefs.quiet_end)}
                is24Hour
                onChange={handleEndChange}
                display={Platform.OS === "ios" ? "spinner" : "default"}
              />
            )}
          </View>
        )}

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
    marginBottom: 6,
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
  utcNote: {
    color: "rgba(255,255,255,0.4)",
    fontFamily: fonts.poppins,
    fontSize: 11,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeBlock: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: fonts.poppins,
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  timeButton: {
    backgroundColor: "rgba(10, 28, 50, 0.7)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
  },
  timeValue: {
    color: colors.brandCyan,
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 20,
    letterSpacing: 1,
  },
  timeSeparator: {
    color: "rgba(255,255,255,0.3)",
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
    paddingTop: 20,
  },
});
