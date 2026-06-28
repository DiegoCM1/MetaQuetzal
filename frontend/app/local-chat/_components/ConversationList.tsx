import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { colors } from "../../../utils/theme";
import type { Conversation } from "../_types";

/** Persisted conversations, shown even when the peer is out of range. */
export function ConversationList({
  conversations,
  inRangeIds,
  onOpen,
}: {
  conversations: Conversation[];
  inRangeIds: Set<string>;
  onOpen: (peerId: string, nickname: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="font-poppins-semibold text-lg text-white">
        Conversaciones previas
      </Text>
      {conversations.map((c) => {
        const last = c.messages[0]; // store is newest-first
        const here = inRangeIds.has(c.peerId);
        return (
          <Pressable
            key={c.peerId}
            onPress={() => onOpen(c.peerId, c.peerNickname)}
            android_ripple={{ color: "rgba(255,255,255,0.12)" }}
            className="flex-row items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-brand-surface px-4 py-3.5 active:opacity-70"
          >
            <View className="flex-1 flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <MaterialCommunityIcons
                  name="account-clock"
                  size={18}
                  color="white"
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-poppins-semibold text-sm text-white">
                    {c.peerNickname}
                  </Text>
                  {here ? (
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: colors.brandGreen }}
                    />
                  ) : null}
                </View>
                <Text
                  numberOfLines={1}
                  className="font-poppins text-xs text-white/40"
                >
                  {last ? last.body : here ? "En rango" : "Fuera de rango"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="white"
            />
          </Pressable>
        );
      })}
    </View>
  );
}
