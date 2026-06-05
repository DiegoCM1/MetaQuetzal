import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { colors } from '../utils/theme';
import { API_BASE_URL } from '../utils/config';

const NOTIF_KEY = process.env.EXPO_PUBLIC_NOTIF_API_KEY as string | undefined;

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type TestButton = {
  label: string;
  icon: MCIName;
  color: string;
  payload: { title: string; body: string; data: Record<string, string> };
};

const BUTTONS: TestButton[] = [
  {
    label: 'Huracán Nivel 2 — Verde',
    icon: 'weather-hurricane',
    color: colors.brandGreen,
    payload: {
      title: 'Alerta SIAT-CT Verde [PRUEBA]',
      body: 'Ciclón de prueba | Distancia: ~200 km | ETA: ~36h',
      data: { siat_level: '2', siat_color: 'VERDE' },
    },
  },
  {
    label: 'Huracán Nivel 4 — Naranja (fullscreen)',
    icon: 'alert-octagram',
    color: colors.brandOrange,
    payload: {
      title: 'Alerta SIAT-CT Naranja [PRUEBA]',
      body: 'Ciclón de prueba | Distancia: ~50 km | ETA: ~8h',
      data: { siat_level: '4', siat_color: 'NARANJA', fullScreen: 'true' },
    },
  },
  {
    label: 'SOS de prueba',
    icon: 'alarm-light-outline',
    color: colors.brandRed,
    payload: {
      title: 'SOS — Equipo BluEye [PRUEBA]',
      body: 'Necesita ayuda urgente. Toca para ver su ubicación.',
      data: { category: 'sos', sender_name: 'Test BluEye', lat: '19.43264', lon: '-99.13318' },
    },
  },
  {
    label: 'Push genérico',
    icon: 'bell-outline',
    color: colors.brandBlue,
    payload: {
      title: 'Notificación de prueba [PRUEBA]',
      body: 'Esta es una notificación de prueba del equipo BluEye.',
      data: {},
    },
  },
];

export default function NotificationTestScreen() {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const keyMissing = !NOTIF_KEY;

  const sendTest = async (index: number) => {
    if (keyMissing || loadingIndex !== null) return;
    setLoadingIndex(index);
    try {
      const { payload } = BUTTONS[index];
      const res = await fetch(`${API_BASE_URL}/api/v1/notifications/send-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': NOTIF_KEY! },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      Toast.show({ type: 'success', text1: 'Enviado', text2: `${data.success_count} dispositivo(s)` });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al enviar', text2: String(e) });
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

        {keyMissing && (
          <View
            className="mb-6 rounded-xl px-4 py-3"
            style={{
              backgroundColor: `${colors.brandOrange}22`,
              borderWidth: 1,
              borderColor: colors.brandOrange,
            }}
          >
            <Text className="text-sm font-poppins-semibold" style={{ color: colors.brandOrange }}>
              API key no configurada
            </Text>
            <Text className="text-xs font-poppins text-white/60 mt-1">
              Agrega EXPO_PUBLIC_NOTIF_API_KEY en tu .env o en las variables de tu build.
            </Text>
          </View>
        )}

        {BUTTONS.map((btn, index) => (
          <TouchableOpacity
            key={btn.label}
            onPress={() => sendTest(index)}
            disabled={keyMissing || loadingIndex !== null}
            className="flex-row items-center mb-4 rounded-2xl px-5 py-4"
            style={{
              backgroundColor: keyMissing ? 'rgba(255,255,255,0.03)' : `${btn.color}22`,
              borderWidth: 1,
              borderColor: keyMissing ? 'rgba(255,255,255,0.1)' : btn.color,
              opacity: loadingIndex !== null && loadingIndex !== index ? 0.5 : 1,
            }}
          >
            {loadingIndex === index ? (
              <ActivityIndicator size="small" color={btn.color} style={{ marginRight: 12 }} />
            ) : (
              <MaterialCommunityIcons
                name={btn.icon}
                size={22}
                color={keyMissing ? 'rgba(255,255,255,0.3)' : btn.color}
                style={{ marginRight: 12 }}
              />
            )}
            <Text
              className="flex-1 font-poppins-semibold text-sm"
              style={{ color: keyMissing ? 'rgba(255,255,255,0.3)' : 'white' }}
            >
              {btn.label}
            </Text>
            {loadingIndex !== null && loadingIndex !== index && (
              <Text className="text-xs font-poppins text-white/30">espera...</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
