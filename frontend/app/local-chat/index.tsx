import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import ScreenHeader from "../../components/ScreenHeader";
import { ConnectionToggles } from "./_components/ConnectionToggles";
import { ConversationList } from "./_components/ConversationList";
import { NicknameModal } from "./_components/NicknameModal";
import { PeerList } from "./_components/PeerList";
import { StatusHero } from "./_components/StatusHero";
import { TechLog } from "./_components/TechLog";
import { useLocalChatContext } from "./_context/LocalChatProvider";

function openChat(peerId: string, nickname: string) {
  router.push({ pathname: "/local-chat/chat", params: { peerId, nickname } });
}

export default function LocalChatLobbyScreen() {
  const chat = useLocalChatContext();
  const [editing, setEditing] = useState(false);

  const connectedName =
    chat.peers.find((p) => p.deviceId === chat.connectedPeerId)?.nickname ??
    chat.conversations.find((c) => c.peerId === chat.connectedPeerId)
      ?.peerNickname;

  const inRangeIds = new Set(chat.peers.map((p) => p.deviceId));

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Chat offline" />

      {/* Identity row */}
      <Pressable
        onPress={() => setEditing(true)}
        className="mx-4 mt-2 flex-row items-center justify-between rounded-2xl border border-white/10 bg-brand-surface px-4 py-3 active:opacity-70"
      >
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons
            name="account-circle"
            size={20}
            color="white"
          />
          <Text className="font-poppins text-sm text-white/70">
            Tú:{" "}
            <Text className="font-poppins-semibold text-white">
              {chat.nickname || "Sin nombre"}
            </Text>
          </Text>
        </View>
        <MaterialCommunityIcons
          name="pencil"
          size={18}
          color="rgba(255,255,255,0.6)"
        />
      </Pressable>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* On an unsupported platform this isn't a fault, it's an unshipped
            feature — but StatusHero only knows "error", so handing it the
            provider's platform message rendered a red "Algo falló". Same
            information, wrong story: a user reads it as a broken app rather
            than one that hasn't got there yet. */}
        {chat.supported ? (
          <StatusHero
            advertising={chat.advertising}
            discovering={chat.discovering}
            connecting={chat.connecting}
            peerName={connectedName}
            error={chat.error}
          />
        ) : (
          <View className="rounded-2xl border border-white/10 bg-brand-surface p-5">
            <View className="flex-row items-center gap-3">
              <MaterialCommunityIcons
                name="clock-outline"
                size={26}
                color="rgba(255,255,255,0.7)"
              />
              <Text className="font-poppins-semibold text-lg text-white">
                Próximamente en iPhone
              </Text>
            </View>
            <Text className="mt-3 font-poppins text-sm leading-5 text-white/60">
              El chat sin internet se conecta directo con teléfonos cercanos por
              Bluetooth. Por ahora funciona solo en Android — estamos trabajando
              en la versión para iPhone.
            </Text>
          </View>
        )}

        {chat.supported ? (
          <>
            <ConnectionToggles
              advertising={chat.advertising}
              discovering={chat.discovering}
              busy={
                chat.advertising ||
                chat.discovering ||
                chat.connecting ||
                chat.connectedPeerId !== null
              }
              disabled={!chat.available}
              onToggleAdvertise={chat.toggleAdvertise}
              onToggleDiscover={chat.toggleDiscover}
              onStop={chat.resetSession}
            />

            <PeerList
              peers={chat.peers}
              connectedPeerId={chat.connectedPeerId}
              onOpen={(peer) => openChat(peer.deviceId, peer.nickname)}
            />

            <ConversationList
              conversations={chat.conversations}
              inRangeIds={inRangeIds}
              onOpen={openChat}
            />

            {/* Dev-only: hidden in release builds (preview/production). */}
            {__DEV__ ? <TechLog logs={chat.logs} /> : null}
          </>
        ) : null}
      </ScrollView>

      <NicknameModal
        visible={editing}
        initial={chat.nickname}
        dismissable
        onSave={(n) => {
          chat.setNickname(n);
          setEditing(false);
        }}
        onClose={() => setEditing(false)}
      />
    </SafeAreaView>
  );
}
