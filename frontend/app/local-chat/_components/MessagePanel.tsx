import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";

import type { LocalMessage, MessageStatus } from "../_types";

const STATUS_LABEL: Record<MessageStatus, string> = {
  sending: "Enviando…",
  sent: "Enviado",
  failed: "No enviado",
  queued: "En cola",
};

function Bubble({ message }: { message: LocalMessage }) {
  if (message.author === "system") {
    return (
      <Text className="self-center rounded-full bg-white/5 px-3 py-1.5 font-poppins text-xs text-white/60">
        {message.body}
      </Text>
    );
  }

  const self = message.author === "self";
  return (
    <View className={self ? "items-end" : "items-start"}>
      <View
        className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 ${
          self ? "bg-brand-cyan" : "border border-white/10 bg-white/5"
        }`}
      >
        <Text
          className={`font-poppins text-sm ${self ? "text-[#04233d]" : "text-white"}`}
        >
          {message.body}
        </Text>
      </View>
      {self && message.status ? (
        <Text
          className={`mt-1 font-poppins text-[10px] ${
            message.status === "failed" ? "text-brand-red" : "text-white/40"
          }`}
        >
          {STATUS_LABEL[message.status]}
        </Text>
      ) : null}
    </View>
  );
}

export function MessagePanel({
  messages,
  draft,
  canSend,
  onChangeDraft,
  onSend,
}: {
  messages: LocalMessage[];
  draft: string;
  canSend: boolean;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
}) {
  const sendDisabled = !canSend || !draft.trim();

  return (
    <View className="gap-3">
      <Text className="font-poppins-semibold text-base text-white">
        Mensajes
      </Text>
      <View className="flex-row items-end gap-2">
        <TextInput
          multiline
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Escribe un mensaje…"
          placeholderTextColor="rgba(255,255,255,0.4)"
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-poppins text-sm text-white"
          style={{ maxHeight: 110, minHeight: 48 }}
        />
        <Pressable
          disabled={sendDisabled}
          onPress={onSend}
          android_ripple={{
            color: "rgba(255,255,255,0.25)",
            borderless: false,
          }}
          className={`h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-brand-blue active:opacity-70 ${
            sendDisabled ? "opacity-40" : ""
          }`}
        >
          <MaterialCommunityIcons name="send" size={20} color="white" />
        </Pressable>
      </View>
      <View className="gap-2">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
      </View>
    </View>
  );
}
