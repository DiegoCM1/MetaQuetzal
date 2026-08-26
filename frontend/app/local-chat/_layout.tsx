import { Stack } from "expo-router";

import { NicknameModal } from "./_components/NicknameModal";
import {
  LocalChatProvider,
  useLocalChatContext,
} from "./_context/LocalChatProvider";

/** Forces a nickname on first use — it's the stable identity, not cosmetic. */
function NicknameGate() {
  const { needsNickname, nickname, setNickname } = useLocalChatContext();
  return (
    <NicknameModal
      visible={needsNickname}
      initial={nickname}
      dismissable={false}
      onSave={setNickname}
    />
  );
}

export default function LocalChatLayout() {
  return (
    <LocalChatProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="mesh" />
      </Stack>
      <NicknameGate />
    </LocalChatProvider>
  );
}
