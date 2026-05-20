import "../../global.css";
import Markdown from "react-native-markdown-display";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { FlashList } from "@shopify/flash-list";
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


export default function ChatAIScreen() {
  const { messages, input, setInput, isLoading, isStreaming, restartConversation, handleSendMessage, stop } = useChat()
  const { modelMode } = useModel()
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const keyboardOffset = Platform.OS === 'ios' ? tabBarHeight : 0
  const canStop = isStreaming && modelMode === 'online'
  const showThinking = isLoading && !isStreaming

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
          {/* Messages List */}
          <FlashList
            data={messages}
            keyExtractor={(item, index) => index.toString()}
            className="flex-1 pt-4"
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={() => (
              <View style={{ height: 600 }} className="flex-row items-center justify-center">
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
            )}
            ListFooterComponent={showThinking ? <ThinkingBubble /> : null}
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
