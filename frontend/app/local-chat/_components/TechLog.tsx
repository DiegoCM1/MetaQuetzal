import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

/** Collapsible developer log — debugging power without the visual noise. */
export function TechLog({ logs }: { logs: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <View className="rounded-2xl border border-white/10 bg-white/5">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between p-4"
      >
        <Text className="font-poppins-semibold text-sm text-white/70">
          Detalles técnicos
        </Text>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color="rgba(255,255,255,0.6)"
        />
      </Pressable>
      {open ? (
        <View className="gap-2 px-4 pb-4">
          {logs.map((line, index) => (
            <View key={`${index}-${line}`} className="flex-row gap-2">
              <View className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-cyan" />
              <Text className="flex-1 font-poppins text-xs leading-4 text-white/60">
                {line}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
