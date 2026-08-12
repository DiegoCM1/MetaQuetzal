import "../../global.css";
import { useEffect, useMemo, useRef } from "react";
import Markdown from "react-native-markdown-display";
import {
  Animated,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { colors, fonts } from "../../utils/theme";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useChat } from "./_hooks/useChat"
import { useModel } from "./_context/ModelContext"

// Permanent accuracy caveat pinned above the composer. Bluai is an emergency
// product: the model can be confidently wrong, and official channels always win.
const AI_DISCLAIMER =
  "Bluai usa IA y puede cometer errores. Verifica siempre con fuentes oficiales.";

export default function ChatAIScreen() {
  const { messages, input, setInput, isLoading, isStreaming, restartConversation, handleSendMessage, stop } = useChat()
  const { modelMode } = useModel()
  // Inverted FlatList renders newest-first (index 0 = bottom anchor). Keep the
  // chronological order untouched in state/storage; only reverse for rendering.
  const reversedMessages = useMemo(() => messages.slice().reverse(), [messages]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const keyboardOffset = Platform.OS === 'ios' ? tabBarHeight : 0
  const canStop = isStreaming && modelMode === 'online'
  const showThinking = isLoading && !isStreaming

  // The disclaimer marks a *finished* answer, so it only shows when the newest
  // message is a bot reply that has actually landed. Checking the text rather
  // than the loading flags is deliberate: useChat pushes an empty 'bot'
  // placeholder at send time, and the offline path never sets isStreaming and
  // can drop isLoading for a frame before generation starts. An empty string is
  // true for every one of those in-flight states, on both providers.
  const lastMessage = messages[messages.length - 1];
  const showDisclaimer =
    !isLoading &&
    !isStreaming &&
    lastMessage?.role === "bot" &&
    !lastMessage.error &&
    lastMessage.text.trim().length > 0;

  // Fade in on arrival; hide instantly when the user sends again so clearing it
  // feels like a response to their input rather than a lagging animation.
  const disclaimerOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(disclaimerOpacity, {
      toValue: showDisclaimer ? 1 : 0,
      duration: showDisclaimer ? 260 : 0,
      useNativeDriver: true,
    }).start();
  }, [showDisclaimer, disclaimerOpacity]);

  const markdownStyles = {
    body: {
      color: "white",
      fontSize: 16,
      fontFamily: fonts.poppins,
    },
  };

  const SendButton = () => (
    <TouchableOpacity
      className={`h-10 w-10 rounded-full items-center justify-center ${!canStop && (isLoading || isStreaming) ? "opacity-50" : ""}`}
      onPress={canStop ? stop : handleSendMessage}
      disabled={!canStop && (isLoading || isStreaming)}
    >
      <MaterialCommunityIcons name={canStop ? "stop" : "send"} size={20} color="white" />
    </TouchableOpacity>
  );

  const ThinkingBubble = () => (
    <View className="mb-2 flex-row justify-start">
      <View className="max-w-[80%] rounded-2xl rounded-tl-none bg-brand-blue/20 px-4 py-3">
        <ActivityIndicator size="small" color="gray" />
      </View>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-transparent"
      edges={["top", "left", "right"]}
    >
      <StatusBar style="light" translucent={false} />

      {/* Model Mode Disclaimer */}
      {modelMode && (
        <View className="items-center py-1">
          <Text className="text-xs font-poppins text-white/40">
            {modelMode === 'offline'
              ? 'Modo sin conexión — IA local activa'
              : 'Modo en línea — IA en la nube activa'}
          </Text>
        </View>
      )}

      {/* Restart Conversation Button */}
      <TouchableOpacity
        className="h-10 w-10 absolute top-0 left-4 rounded-full z-50 items-center justify-center"
        style={{ top: insets.top }}
        onPress={restartConversation}
      >
        <MaterialCommunityIcons name="reload" size={20} color="white" />
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View className="flex-1 px-2 pt-2">
          {/* Messages List — inverted FlatList for rock-solid bottom anchoring.
              Data is reversed (newest at index 0 = bottom); RN counter-flips each
              cell so content renders upright. New & streaming messages live at the
              bottom anchor and stay pinned with zero scroll heuristics. */}
          {messages.length === 0 ? (
            // Empty state rendered outside the list so the inverted transform
            // can't flip the prompt upside down.
            <View className="flex-1 flex-row items-center justify-center">
              <Text className="text-3xl font-poppins-semibold text-center text-white">
                ¿
              </Text>
              <Text className="text-3xl font-poppins-semibold text-white/60 text-center">
                En qué puedo ayudar
              </Text>
              <Text className="text-3xl font-poppins-semibold text-center text-white">
                ?
              </Text>
            </View>
          ) : (
            <FlatList
              data={reversedMessages}
              inverted
              keyExtractor={(item) => `${item.timestamp}-${item.role}`}
              style={{ flex: 1 }}
              // In an inverted list, paddingTop renders at the visual BOTTOM
              // (the gap between the newest message and the input bar).
              contentContainerStyle={{ paddingTop: 20 }}
              // Inverted swaps the header/footer ends: ListHeaderComponent renders
              // at the visual bottom, so the thinking bubble (newest end) goes here.
              ListHeaderComponent={showThinking ? <ThinkingBubble /> : null}
              renderItem={({ item }) => (
                <View
                  className={`mb-1 flex-row ${item.role === "user" ? "justify-end" : "justify-start"
                    }`}
                >
                  <View
                    className={`rounded-2xl ${item.role === "user"
                        ? "max-w-[80%] rounded-lg py-3 px-4 bg-brand-blue"
                        : "flex-1 rounded-tl-none py-1 px-2"
                      }`}
                  >
                    {item.role === "user" ? (
                      <Text className="text-base font-poppins text-white">{item.text}</Text>
                    ) : item.error === true ? (
                      <Text className="text-base font-poppins text-brand-red">
                        {item.text}
                      </Text>
                    ) : (
                      <Markdown style={markdownStyles}>{item.text}</Markdown>
                    )}
                  </View>
                </View>
              )}
            />
          )}

          {/* AI accuracy disclaimer — appears once a finished bot reply is the
              newest message, clears as soon as the user sends again.
              Font scaling is capped: at a large accessibility text size this
              row would otherwise grow tall enough to squeeze the message list
              on Android, where the keyboard compresses the container. */}
          {showDisclaimer && (
            <Animated.View style={{ opacity: disclaimerOpacity }}>
              <Text
                className="px-2 pb-2 text-center font-poppins text-[10px] leading-4 text-white/40"
                maxFontSizeMultiplier={1.3}
              >
                {AI_DISCLAIMER}
              </Text>
            </Animated.View>
          )}

          {/* Input Area */}
          <View className="py-4 border-t border-brand-blue/30">
            <View className="flex-row items-center justify-center space-x-2">
              {/* Text Input */}
              <View className="flex-1 flex-row items-center text-center rounded-3xl border border-white">
                <TextInput
                  className="flex-1 px-4 py-2 border-none items-center outline-none text-white font-poppins"
                  placeholder="Escribe un mensaje..."
                  placeholderTextColor="rgb(156,163,175)"
                  value={input}
                  onChangeText={setInput}
                />
              </View>

              {/* Send Button */}
              <SendButton />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
