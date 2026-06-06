import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { colors } from '../utils/theme';
import { authFetch } from '../utils/api';
import { API_BASE_URL } from '../utils/config';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type NotificationTestType = 'hurricane_l2' | 'hurricane_l4' | 'sos_test' | 'generic';

type TestButton = {
  label: string;
  icon: MCIName;
  color: string;
  type: NotificationTestType;
};

const BUTTONS: TestButton[] = [
  { label: 'Huracán Nivel 2 — Verde',          icon: 'weather-hurricane',  color: colors.brandGreen,  type: 'hurricane_l2' },
  { label: 'Huracán Nivel 4 — Naranja (fullscreen)', icon: 'alert-octagram', color: colors.brandOrange, type: 'hurricane_l4' },
  { label: 'SOS de prueba',                    icon: 'alarm-light-outline', color: colors.brandRed,    type: 'sos_test' },
  { label: 'Push genérico',                   icon: 'bell-outline',        color: colors.brandBlue,   type: 'generic' },
];

export default function NotificationTestScreen() {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const sendTest = async (index: number) => {
    if (loadingIndex !== null) return;
    setLoadingIndex(index);
    try {
      const res = await authFetch(`${API_BASE_URL}/api/v1/notifications/test`, {
        method: 'POST',
        body: JSON.stringify({ type: BUTTONS[index].type }),
      });
      if (res.status === 403) {
        Toast.show({ type: 'error', text1: 'No autorizado', text2: 'Tu cuenta no tiene acceso a esta herramienta.' });
        return;
      }
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
      </ScrollView>
    </SafeAreaView>
  );
}
