import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toast } from 'sonner-native';
import { colors } from '../utils/theme';
import { authFetch } from '../utils/api';
import { API_BASE_URL } from '../utils/config';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type NotificationTestType = 'hurricane_l2' | 'hurricane_l3' | 'hurricane_l4' | 'sos_test' | 'generic';

type TestButton = {
  label: string;
  icon: MCIName;
  color: string;
  type: NotificationTestType;
};

const BUTTONS: TestButton[] = [
  { label: 'Huracán Nivel 2 — Verde',               icon: 'weather-hurricane',  color: colors.brandGreen,   type: 'hurricane_l2' },
  { label: 'Huracán Nivel 3 — Amarillo',             icon: 'weather-hurricane',  color: colors.brandYellow,  type: 'hurricane_l3' },
  { label: 'Huracán Nivel 4 — Naranja (fullscreen)', icon: 'alert-octagram',     color: colors.brandOrange,  type: 'hurricane_l4' },
  { label: 'SOS de prueba',                         icon: 'alarm-light-outline', color: colors.brandRed,     type: 'sos_test' },
  { label: 'Push genérico',                         icon: 'bell-outline',        color: colors.brandBlue,    type: 'generic' },
];

type FakeCyclonePreset = {
  label: string;
  sublabel: string;
  color: string;
  body: { name: string; lat: number; lon: number; wind_kmh: number; movement_speed_kmh: number };
};

// Posiciones en el Golfo de México, calibradas para usuarios en CDMX (~19.4°N, -99.1°W)
const CYCLONE_PRESETS: FakeCyclonePreset[] = [
  {
    label: 'Nivel 2 — Verde',
    sublabel: '~510 km · ETA ~51h',
    color: colors.brandGreen,
    body: { name: 'FALSO-VERDE', lat: 23.0, lon: -96.0, wind_kmh: 130, movement_speed_kmh: 10 },
  },
  {
    label: 'Nivel 4 — Naranja',
    sublabel: '~200 km · ETA ~10h',
    color: colors.brandOrange,
    body: { name: 'FALSO-NARANJA', lat: 21.0, lon: -98.0, wind_kmh: 160, movement_speed_kmh: 20 },
  },
  {
    label: 'Nivel 5 — Rojo',
    sublabel: '~87 km · ETA ~2.9h',
    color: colors.brandRed,
    body: { name: 'FALSO-ROJO', lat: 20.0, lon: -98.5, wind_kmh: 200, movement_speed_kmh: 30 },
  },
];

export default function NotificationTestScreen() {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [onlyMe, setOnlyMe] = useState(true);
  const [cycloneLoadingIndex, setCycloneLoadingIndex] = useState<number | null>(null);

  const [resetLoading, setResetLoading] = useState(false);
  const [smnLoading, setSmnLoading] = useState(false);

  const confirmBroadcast = (): Promise<boolean> =>
    new Promise(resolve =>
      Alert.alert(
        '¿Enviar a todos?',
        'Esto mandará la notificación a TODOS los dispositivos registrados en esta base de datos.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Enviar', style: 'destructive', onPress: () => resolve(true) },
        ],
      ),
    );

  const injectCyclone = async (index: number) => {
    if (cycloneLoadingIndex !== null) return;
    setCycloneLoadingIndex(index);
    try {
      const preset = CYCLONE_PRESETS[index];
      console.log('[SIAT] inject-cyclone →', preset.body.name, preset.body);
      const res = await authFetch(`${API_BASE_URL}/api/v1/siat/inject-cyclone`, {
        method: 'POST',
        body: JSON.stringify(preset.body),
      });
      console.log('[SIAT] inject-cyclone status:', res.status);
      if (res.status === 403) {
        console.warn('[SIAT] inject-cyclone 403 — sin acceso');
        toast.error('Sin acceso', { description: 'Pide que agreguen tu email a NOTIFICATION_TEST_ADMIN_EMAILS en backend/.env' });
        return;
      }
      if (res.status === 422) {
        const err = await res.json().catch(() => ({}));
        console.warn('[SIAT] inject-cyclone 422 — sin ubicación:', err.detail);
        toast.error('Sin ubicación registrada', { description: err.detail || 'Configura tu ubicación en el perfil antes de inyectar.' });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[SIAT] inject-cyclone OK — users_evaluated:', data.users_evaluated, 'notifications_sent:', data.notifications_sent, 'assessments:', data.assessments);
      const firstAssessment = data.assessments?.[0];
      const detail = firstAssessment
        ? `${data.users_evaluated} eval. · Nivel ${firstAssessment.siat_level} ${firstAssessment.siat_color} · ${firstAssessment.distance_km?.toFixed(0)} km`
        : `${data.users_evaluated} evaluado(s)`;
      const notifDesc = data.notifications_sent > 0
        ? `Push enviado · ${detail}`
        : `Sin push · ${detail} · (revisa quiet hours o nivel mínimo)`;
      toast.success(`Ciclón inyectado · ${preset.label}`, { description: notifDesc });
    } catch (e) {
      console.error('[SIAT] inject-cyclone error:', e);
      toast.error('Error al inyectar ciclón', { description: String(e) });
    } finally {
      setCycloneLoadingIndex(null);
    }
  };

  const resetSiatState = async () => {
    if (resetLoading) return;
    setResetLoading(true);
    try {
      console.log('[SIAT] reset-state →');
      const res = await authFetch(`${API_BASE_URL}/api/v1/siat/reset-state`, { method: 'POST' });
      console.log('[SIAT] reset-state status:', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('[SIAT] reset-state OK');
      toast.success('Estado SIAT reiniciado', { description: 'La siguiente inyección evaluará desde nivel 0.' });
    } catch (e) {
      console.error('[SIAT] reset-state error:', e);
      toast.error('Error al reiniciar', { description: String(e) });
    } finally {
      setResetLoading(false);
    }
  };

  const injectSmnAlert = async () => {
    if (smnLoading) return;
    setSmnLoading(true);
    try {
      console.log('[SMN] inject-smn-alert → level 3');
      const res = await authFetch(`${API_BASE_URL}/api/v1/siat/inject-smn-alert`, {
        method: 'POST',
        body: JSON.stringify({ level: 3, title: 'SMN: Alerta Meteorológica de Prueba [TEST]', short: 'Prueba de alerta nacional SMN/CONAGUA generada por el equipo BluEye.' }),
      });
      console.log('[SMN] inject-smn-alert status:', res.status);
      if (res.status === 403) {
        console.warn('[SMN] inject-smn-alert 403 — sin acceso');
        toast.error('Sin acceso', { description: 'Pide que agreguen tu email a NOTIFICATION_TEST_ADMIN_EMAILS en backend/.env' });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[SMN] inject-smn-alert OK — notifications_sent:', data.notifications_sent, 'users_evaluated:', data.users_evaluated);
      const desc = data.notifications_sent > 0
        ? `Push enviado a ${data.notifications_sent} dispositivo(s) · ${data.users_evaluated} usuario(s) evaluados`
        : `${data.users_evaluated} usuario(s) evaluados · sin push (revisa prefs)`;
      toast.success('Alerta SMN inyectada', { description: desc });
    } catch (e) {
      console.error('[SMN] inject-smn-alert error:', e);
      toast.error('Error al inyectar alerta SMN', { description: String(e) });
    } finally {
      setSmnLoading(false);
    }
  };

  const sendTest = async (index: number) => {
    if (loadingIndex !== null) return;
    if (!onlyMe && !(await confirmBroadcast())) return;
    setLoadingIndex(index);
    const btn = BUTTONS[index];
    console.log('[NotifTest] sendTest →', btn.type, '| only_me:', onlyMe);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/notifications/test`, {
        method: 'POST',
        body: JSON.stringify({ type: btn.type, only_me: onlyMe }),
      });
      console.log('[NotifTest] sendTest status:', res.status);
      if (res.status === 403) {
        console.warn('[NotifTest] sendTest 403 — sin acceso');
        toast.error('Sin acceso', { description: 'Pide que agreguen tu email a NOTIFICATION_TEST_ADMIN_EMAILS en backend/.env' });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      console.log('[NotifTest] sendTest OK — success_count:', data.success_count, 'failure_count:', data.failure_count);
      const desc = onlyMe ? 'Solo tu dispositivo' : `${data.success_count} dispositivo(s)`;
      toast.success('Enviado', { description: desc });
    } catch (e) {
      console.error('[NotifTest] sendTest error:', e);
      toast.error('Error al enviar', { description: String(e) });
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} className="flex-1 bg-transparent">
      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        <Text className="text-xl font-poppins-semibold text-white mb-1">
          Dev: Notificaciones
        </Text>
        <Text className="text-sm font-poppins text-white/50 mb-6">
          Herramienta interna — solo visible en staging/dev
        </Text>

        {/* Destino de la notificación */}
        <View
          className="flex-row items-center justify-between mb-6 rounded-2xl px-5 py-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
        >
          <View className="flex-1 mr-4">
            <Text className="text-sm font-poppins-semibold text-white">Solo mi dispositivo</Text>
            <Text className="text-xs font-poppins text-white/50 mt-0.5">
              {onlyMe ? 'Push solo a tus tokens registrados' : 'Broadcast a TODOS los dispositivos'}
            </Text>
          </View>
          <Switch
            value={onlyMe}
            onValueChange={setOnlyMe}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.brandBlue }}
            thumbColor="white"
          />
        </View>

        {BUTTONS.map((btn, index) => (
          <TouchableOpacity
            key={btn.type}
            onPress={() => sendTest(index)}
            disabled={loadingIndex !== null}
            className="flex-row items-center mb-4 rounded-2xl px-5 py-4"
            style={{
              backgroundColor: `${btn.color}22`,
              borderWidth: 1,
              borderColor: btn.color,
              opacity: loadingIndex !== null && loadingIndex !== index ? 0.5 : 1,
            }}
          >
            {loadingIndex === index ? (
              <ActivityIndicator size="small" color={btn.color} style={{ marginRight: 12 }} />
            ) : (
              <MaterialCommunityIcons name={btn.icon} size={22} color={btn.color} style={{ marginRight: 12 }} />
            )}
            <Text className="flex-1 font-poppins-semibold text-sm" style={{ color: 'white' }}>
              {btn.label}
            </Text>
            {loadingIndex !== null && loadingIndex !== index && (
              <Text className="text-xs font-poppins text-white/30">espera...</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Sección: inyección de ciclón falso */}
        <Text className="text-base font-poppins-semibold text-white mt-4 mb-1">
          Motor SIAT — Ciclón Falso
        </Text>
        <Text className="text-xs font-poppins text-white/50 mb-4">
          Inyecta un ciclón de prueba y corre el ciclo SIAT completo end-to-end.{'\n'}
          Posiciones calibradas para usuarios en CDMX.
        </Text>

        {CYCLONE_PRESETS.map((preset, index) => (
          <TouchableOpacity
            key={preset.body.name}
            onPress={() => injectCyclone(index)}
            disabled={cycloneLoadingIndex !== null}
            className="flex-row items-center mb-4 rounded-2xl px-5 py-4"
            style={{
              backgroundColor: `${preset.color}22`,
              borderWidth: 1,
              borderColor: preset.color,
              opacity: cycloneLoadingIndex !== null && cycloneLoadingIndex !== index ? 0.5 : 1,
            }}
          >
            {cycloneLoadingIndex === index ? (
              <ActivityIndicator size="small" color={preset.color} style={{ marginRight: 12 }} />
            ) : (
              <MaterialCommunityIcons name="weather-hurricane" size={22} color={preset.color} style={{ marginRight: 12 }} />
            )}
            <View className="flex-1">
              <Text className="font-poppins-semibold text-sm text-white">{preset.label}</Text>
              <Text className="font-poppins text-xs text-white/50">{preset.sublabel}</Text>
            </View>
            {cycloneLoadingIndex !== null && cycloneLoadingIndex !== index && (
              <Text className="text-xs font-poppins text-white/30">espera...</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Reset estado SIAT */}
        <TouchableOpacity
          onPress={resetSiatState}
          disabled={resetLoading}
          className="flex-row items-center mb-4 rounded-2xl px-5 py-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
        >
          {resetLoading
            ? <ActivityIndicator size="small" color="white" style={{ marginRight: 12 }} />
            : <MaterialCommunityIcons name="refresh" size={22} color="white" style={{ marginRight: 12 }} />}
          <View className="flex-1">
            <Text className="font-poppins-semibold text-sm text-white">Limpiar estado SIAT</Text>
            <Text className="font-poppins text-xs text-white/50">Permite volver a disparar escalación desde el mismo nivel</Text>
          </View>
        </TouchableOpacity>

        {/* Sección: alerta SMN nacional */}
        <Text className="text-base font-poppins-semibold text-white mt-4 mb-1">
          Ruta SMN/CONAGUA
        </Text>
        <Text className="text-xs font-poppins text-white/50 mb-4">
          Inyecta una alerta nacional (sin coords) y la procesa vía geocercado.{'\n'}
          Nivel 3 — AMARILLO por defecto. Llega a todos los usuarios elegibles.
        </Text>

        <TouchableOpacity
          onPress={injectSmnAlert}
          disabled={smnLoading}
          className="flex-row items-center mb-8 rounded-2xl px-5 py-4"
          style={{ backgroundColor: `${colors.brandYellow}22`, borderWidth: 1, borderColor: colors.brandYellow }}
        >
          {smnLoading
            ? <ActivityIndicator size="small" color={colors.brandYellow} style={{ marginRight: 12 }} />
            : <MaterialCommunityIcons name="weather-cloudy-alert" size={22} color={colors.brandYellow} style={{ marginRight: 12 }} />}
          <View className="flex-1">
            <Text className="font-poppins-semibold text-sm text-white">Alerta SMN Nacional — Amarillo</Text>
            <Text className="font-poppins text-xs text-white/50">Nivel 3 · Sin geocoordenadas · Todos los usuarios</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
