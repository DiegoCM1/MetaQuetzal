import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ScreenHeader from "../../components/ScreenHeader";
import { ConnectionToggles } from "./_components/ConnectionToggles";
import { MessagePanel } from "./_components/MessagePanel";
import { PeerList } from "./_components/PeerList";
import { StatusHero } from "./_components/StatusHero";
import { TechLog } from "./_components/TechLog";
import { useLocalChat } from "./_hooks/useLocalChat";

export default function LocalChatScreen() {
  const chat = useLocalChat();

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top", "bottom"]}>
      <ScreenHeader title="Chat offline" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 36, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <StatusHero
          state={chat.state}
          peerName={chat.connectedEndpoint?.name}
          error={chat.error}
        />

        {chat.supported ? (
          <>
            <ConnectionToggles
              state={chat.state}
              disabled={!chat.available}
              onAdvertise={chat.startAdvertising}
              onDiscover={chat.startDiscovery}
              onStop={chat.resetSession}
            />

            <PeerList
              peers={chat.endpoints}
              connectedId={chat.connectedEndpoint?.endpointId}
              onConnect={chat.connectToEndpoint}
            />

            {chat.canSend ? (
              <MessagePanel
                messages={chat.messages}
                draft={chat.draft}
                canSend={chat.canSend}
                onChangeDraft={chat.setDraft}
                onSend={chat.sendMessage}
              />
            ) : null}

            <TechLog logs={chat.logs} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
