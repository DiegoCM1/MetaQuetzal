import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { TransportState } from "../_types";

function ToggleCard({
  active,
  disabled,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-2xl border p-4 ${
        active
          ? "border-brand-blue bg-brand-blue/15"
          : "border-white/10 bg-white/5"
      } ${disabled ? "opacity-40" : ""}`}
    >
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className={`h-11 w-11 items-center justify-center rounded-xl ${
            active ? "bg-brand-blue" : "bg-white/10"
          }`}
        >
          <MaterialCommunityIcons name={icon} size={22} color="white" />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-semibold text-base text-white">
            {title}
          </Text>
          <Text className="font-poppins text-xs text-white/55">{subtitle}</Text>
        </View>
      </View>
      <View
        className={`h-6 w-11 justify-center rounded-full p-0.5 ${
          active ? "bg-brand-blue" : "bg-white/15"
        }`}
      >
        <View
          className={`h-5 w-5 rounded-full bg-white ${active ? "self-end" : "self-start"}`}
        />
      </View>
    </Pressable>
  );
}

export function ConnectionToggles({
  state,
  disabled,
  onAdvertise,
  onDiscover,
  onStop,
}: {
  state: TransportState;
  disabled?: boolean;
  onAdvertise: () => void;
  onDiscover: () => void;
  onStop: () => void;
}) {
  const advertising = state === "advertising";
  const discovering = state === "discovering";
  const busy =
    advertising ||
    discovering ||
    state === "connecting" ||
    state === "connected";

  return (
    <View className="gap-3">
      <ToggleCard
        active={advertising}
        disabled={disabled}
        icon="broadcast"
        title="Soy visible"
        subtitle="Deja que otros te encuentren"
        onPress={advertising ? onStop : onAdvertise}
      />
      <ToggleCard
        active={discovering}
        disabled={disabled}
        icon="magnify"
        title="Buscar gente"
        subtitle="Encuentra teléfonos cercanos"
        onPress={discovering ? onStop : onDiscover}
      />
      {busy ? (
        <Pressable onPress={onStop} className="mt-1 self-center">
          <Text className="font-poppins text-sm text-white/50">
            Detener todo
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
