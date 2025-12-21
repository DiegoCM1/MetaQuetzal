import "../../global.css";
import React, { useState } from "react";
import Markdown from "react-native-markdown-display";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { sendMessage } from "../../api/sendMessage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { track } from "../../utils/analytics";

export default function ChatAIScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets(); // ← gives you { top, bottom, left, right }
  const tabBarHeight = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const markdownStyles = {
    body: {
      color: colorScheme === "dark" ? "white" : "rgb(30, 30, 60)",
      fontSize: 16,
    },
  };

  // Track screen view
  React.useEffect(() => {
    track("ai_screen_view");
  }, []);

  // Persistent storage functions
  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem("chat_messages");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const saveMessages = async (messagesToSave) => {
    try {
      await AsyncStorage.setItem(
        "chat_messages",
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const restartConversation = async () => {
    Alert.alert(
      "Reiniciar conversación",
      "¿Estás seguro de que deseas reiniciar la conversación?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Reiniciar",
          onPress: () => {
            track("ai_restart_conversation");
            setMessages([]);
            saveMessages([]);
          },
        },
      ]
    );
  };

  // Load messages when component mounts
  React.useEffect(() => {
    loadMessages();
  }, []);

  // Save messages whenever they change
  React.useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Send text to AI and handle response
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      sender: "user",
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    track("ai_message_send", { length: userMessage.text.length });

    try {
      const aiResponse = await sendMessage(userMessage.text);
      const botMessage = {
        sender: "bot",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
      track("ai_response_received", { length: aiResponse.length });
    } catch (error) {
      track("ai_response_error", { message: error.message });
      console.error("Error sending message:", error);
      const errorText =
        error.message === "NO_CONNECTION"
          ? "Sin conexión. Verifica tu conexión a Internet."
          : "Ocurrió un error con el asistente.";
      const errorMessage = {
        sender: "error",
        text: errorText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      Alert.alert("Error", errorText);
    } finally {
      setIsLoading(false);
    }
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
      <StatusBar barStyle="light-content" />
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? tabBarHeight : 0}
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
                  item.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <View
                  className={`rounded-2xl ${
                    item.sender === "user"
                      ? "max-w-[80%] bg-phase2Buttons rounded-tr-none py-3 px-4"
                      : "dark:text-phase2Cards rounded-tl-none py-1 px-2"
                  }`}
                >
                  {item.sender === "user" ? (
                    <Text className="text-base text-white">{item.text}</Text>
                  ) : item.sender === "error" ? (
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
