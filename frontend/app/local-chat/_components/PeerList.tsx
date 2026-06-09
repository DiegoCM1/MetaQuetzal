import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../utils/theme";
import type { Peer } from "../_types";

export function PeerList({
  peers,
  connectedId,
  onConnect,
}: {
  peers: Peer[];
  connectedId?: string | null;
  onConnect: (endpointId: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="font-poppins-semibold text-base text-white">
        Dispositivos cercanos
      </Text>
      {peers.length === 0 ? (
        <Text className="font-poppins text-sm text-white/50">
          Nadie por aquí todavía. Activa “Buscar gente”.
        </Text>
      ) : (
        peers.map((peer) => {
          const isConnected = peer.endpointId === connectedId;
          return (
            <Pressable
              key={peer.endpointId}
              onPress={() => onConnect(peer.endpointId)}
              disabled={isConnected}
              android_ripple={{ color: "rgba(255,255,255,0.12)" }}
              className="flex-row items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 active:opacity-70"
            >
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <MaterialCommunityIcons
                    name="account"
                    size={18}
                    color="white"
                  />
                </View>
                <View>
                  <Text className="font-poppins-semibold text-sm text-white">
                    {peer.name}
                  </Text>
                  <Text className="font-poppins text-xs text-white/40">
                    {isConnected ? "Conectado" : "Toca para conectar"}
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons
                name={isConnected ? "check-circle" : "chevron-right"}
                size={20}
                color={isConnected ? colors.brandGreen : "white"}
              />
            </Pressable>
          );
        })
      )}
    </View>
  );
}
