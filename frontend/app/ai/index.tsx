import "../../global.css";
import Markdown from "react-native-markdown-display";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  useColorScheme,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useChat } from "./_hooks/useChat"
import { track } from "../../utils/analytics";


export default function ChatAIScreen() {
  const { messages, input, setInput, isLoading, restartConversation, handleSendMessage, modelDownloadProgress, modelReady, modelMode } = useChat()                        
  const insets = useSafeAreaInsets(); // ← gives you { top, bottom, left, right }
  const tabBarHeight = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const markdownStyles = {
    body: {
      color: colorScheme === "dark" ? "white" : "rgb(30, 30, 60)",
      fontSize: 16,
    },
  };

  // Send button component
  const SendButton = () => (
    <TouchableOpacity
      className={`h-10 w-10 rounded-full bg-phase2Buttons dark:bg-phase2CardsDark items-center justify-center ${isLoading ? "opacity-50" : ""}`}
      onPress={handleSendMessage}
      disabled={isLoading}
    >
      <MaterialCommunityIcons name="send" size={20} color="white" />
    </TouchableOpacity>
  );

  // Indicator shown while waiting for the AI response
  const ThinkingBubble = () => (
    <View className="mb-2 flex-row justify-start">
      <View className="max-w-[80%] rounded-2xl rounded-tl-none bg-phase2Cards dark:bg-phase2CardsDark px-4 py-3">
        <ActivityIndicator size="small" color="gray" />
      </View>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="light" translucent={false} />

      {/* Model Download Progress Banner */}
      {modelDownloadProgress > 0 && !modelReady && (
        <View className="bg-phase2Buttons px-4 py-2 items-center">
          <Text className="text-white text-sm">
            Descargando modelo IA... {Math.round(modelDownloadProgress * 100)}%
          </Text>
        </View>
      )}

      {/* Model Mode Disclaimer */}
      {modelMode && (
        <View className="items-center py-1">
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {modelMode === 'offline'
              ? 'Modo sin conexión — IA local activa'
              : 'Modo en línea — IA en la nube activa'}
          </Text>
        </View>
      )}

      {/* Restart Conversation Button */}
      <TouchableOpacity
        className="h-10 w-10 absolute top-0 left-4 rounded-full z-50 bg-phase2Buttons dark:bg-phase2CardsDark items-center justify-center"
        style={{ top: insets.top }} // safe‑area padding
        onPress={restartConversation}
      >
        <MaterialCommunityIcons name="reload" size={20} color="white" />
      </TouchableOpacity>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={tabBarHeight}
      >
        <View className="flex-1 px-2 pt-2">
          {/* Messages List */}
          <FlatList
            data={messages}
            keyExtractor={(item, index) => index.toString()}
            className="flex-1 pt-4"
            contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
            ListEmptyComponent={() => (
              <View className="flex-1 flex-row items-center justify-center">
                <Text className="text-3xl font-semibold text-phase2Buttons dark:text-phase2TitlesDark text-center">
                  ¿
                </Text>
                <Text className="text-3xl font-semibold text-gray-500 text-center">
                  En qué puedo ayudar
                </Text>
                <Text className="text-3xl font-semibold text-phase2Buttons dark:text-phase2TitlesDark text-center">
                  ?
                </Text>
              </View>
            )}
            ListFooterComponent={isLoading ? <ThinkingBubble /> : null}
            renderItem={({ item }) => (
              <View
                className={`mb-1 flex-row ${
                  item.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <View
                  className={`rounded-2xl ${
                    item.role === "user"
                      ? "max-w-[80%] bg-phase2Buttons rounded-tr-none py-3 px-4"
                      : "dark:text-phase2Cards rounded-tl-none py-1 px-2"
                  }`}
                >
                  {item.role === "user" ? (
                    <Text className="text-base text-white">{item.text}</Text>
                  ) : item.error === true ? (
                    <Text className="text-base text-red-700 dark:text-red-200">
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
          <View className="py-4 border-t border-phase2Borders dark:border-phase2BordersDark">
            <View className="flex-row items-center justify-center space-x-2">
              {/* Text Input */}
              <View className="flex-1 flex-row items-center text-center bg-white dark:bg-phase2CardsDark rounded-full border border-phase2Borders dark:border-phase2BordersDark">
                <TextInput
                  className="flex-1 px-4 py-2 text-phase2Titles dark:text-white border-none items-center outline-none"
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
