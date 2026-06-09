import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { colors } from "../../../utils/theme";
import type { TransportState } from "../_types";

type Meta = {
  label: string;
  helper: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tint: string; // tailwind text-color class
  ring: string; // tailwind border-color class
  hex: string; // icon color
};

const STATE_META: Record<TransportState, Meta> = {
  idle: {
    label: "Desconectado",
    helper: "Activa “Soy visible” o “Buscar gente” para empezar.",
    icon: "bluetooth",
    tint: "text-white/70",
    ring: "border-white/10",
    hex: "rgba(255,255,255,0.7)",
  },
  advertising: {
    label: "Visible para otros",
    helper: "Otros teléfonos con Bluai pueden encontrarte.",
    icon: "broadcast",
    tint: "text-brand-cyan",
    ring: "border-brand-cyan/40",
    hex: colors.brandCyan,
  },
  discovering: {
    label: "Buscando dispositivos…",
    helper: "Rastreando teléfonos cercanos.",
    icon: "magnify",
    tint: "text-brand-cyan",
    ring: "border-brand-cyan/40",
    hex: colors.brandCyan,
  },
  connecting: {
    label: "Conectando…",
    helper: "Estableciendo el enlace.",
    icon: "progress-clock",
    tint: "text-brand-yellow",
    ring: "border-brand-yellow/40",
    hex: colors.brandYellow,
  },
  connected: {
    label: "Conectado",
    helper: "Ya puedes enviar mensajes sin internet.",
    icon: "check-circle",
    tint: "text-brand-green",
    ring: "border-brand-green/40",
    hex: colors.brandGreen,
  },
  error: {
    label: "Algo falló",
    helper: "Revisa Bluetooth, ubicación y permisos.",
    icon: "alert-circle",
    tint: "text-brand-red",
    ring: "border-brand-red/40",
    hex: colors.brandRed,
  },
};

export function StatusHero({
  state,
  peerName,
  error,
}: {
  state: TransportState;
  peerName?: string | null;
  error?: string | null;
}) {
  const showError = Boolean(error);
  const meta = showError ? STATE_META.error : STATE_META[state];
  const label =
    !showError && state === "connected" && peerName
      ? `Conectado con ${peerName}`
      : meta.label;

  return (
    <View className={`rounded-3xl border ${meta.ring} bg-white/5 p-5`}>
      <View className="flex-row items-center gap-3">
        <MaterialCommunityIcons name={meta.icon} size={26} color={meta.hex} />
        <Text className={`font-poppins-semibold text-lg ${meta.tint}`}>
          {label}
        </Text>
      </View>
      {showError ? (
        <Text className="mt-3 font-poppins text-sm leading-5 text-brand-red">
          {error}
        </Text>
      ) : (
        <Text className="mt-2 font-poppins text-sm leading-5 text-white/60">
          {meta.helper}
        </Text>
      )}
    </View>
  );
}
