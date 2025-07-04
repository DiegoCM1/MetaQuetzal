import "../global.css";
import React, { useState } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { Audio } from "expo-audio";
import { sendMessage } from "../api/sendMessage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChatScreen() {
  // Permissions and state handlers
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Camera permission and open handler
  const handleOpenCamera = async () => {
    if (cameraPermission === null) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Por favor habilita el acceso a la cámara."
        );
        return;
      }
      setCameraPermission(true);
    }
    setCameraVisible(true);
  };

  // Image picker from gallery
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Por favor habilita el acceso a la galería."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      Alert.alert("Imagen seleccionada", `Ruta: ${result.assets[0].uri}`);
    }
  };

  // Audio recording handler
  const handleAudioRecord = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Por favor habilita el acceso al micrófono."
        );
        return;
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      Alert.alert("Grabando", "La grabación de audio ha comenzado.");
    } catch (err) {
      console.error("Error al grabar audio:", err);
    }
  };

  // Stop and save audio
  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      Alert.alert("Grabación completa", `Audio guardado en: ${uri}`);
    } catch (err) {
      console.error("Error al detener la grabación:", err);
    }
  };

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

    try {
      const aiResponse = await sendMessage(userMessage.text);
      const botMessage = {
        sender: "bot",
        text: aiResponse,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      Alert.alert("Error", "No se pudo enviar el mensaje. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Update the Send Button JSX
  const SendButton = () => (
    <TouchableOpacity
      className="h-10 w-10 rounded-full bg-phase2Buttons dark:bg-phase2ButtonsDark items-center justify-center"
      onPress={handleSendMessage}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <MaterialCommunityIcons name="send" size={20} color="white" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-phase2Background dark:bg-phase2BackgroundDark">
      <StatusBar barStyle="light-content" />

      <View className="flex-1 px-4 pt-2 pb-4">
        {/* Messages List */}
        <FlatList
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          className="flex-1 pt-4"
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center">
              <Text className="text-3xl font-semibold text-gray-500 text-center">
                ¿En que te puedo ayudar?
                <Text className="text-buttonBlue dark:text-dark-accent">.</Text>
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View
              className={`mb-3 flex-row ${
                item.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  item.sender === "user"
                    ? "bg-phase2Buttons rounded-tr-none"
                    : "bg-phase2Cards dark:bg-phase2CardsDark rounded-tl-none"
                }`}
              >
                <Text
                  className={`text-base ${
                    item.sender === "user"
                      ? "text-white"
                      : "text-phase2Titles dark:text-white"
                  }`}
                >
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        {/* Input Area */}
        <View className="pt-4 border-t border-phase2Borders dark:border-phase2BordersDark">
          <View className="flex-row items-center space-x-2">
            {/* Media Buttons */}
            <View className="flex-row space-x-2">
              <TouchableOpacity
                className="h-10 w-10 rounded-full bg-phase2Buttons dark:bg-phase2ButtonsDark items-center justify-center"
                onPress={handleOpenCamera}
              >
                <MaterialCommunityIcons name="camera" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 w-10 rounded-full bg-phase2Buttons dark:bg-phase2ButtonsDark items-center justify-center"
                onPress={handlePickImage}
              >
                <MaterialCommunityIcons
                  name="folder-image"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            {/* Text Input */}
            <View className="flex-1 flex-row items-center text-center bg-white dark:bg-phase2Cards rounded-full border border-phase2Borders dark:border-phase2BordersDark">
              <TextInput
                className="flex-1 px-4 py-2 text-phase2Titles dark:text-white border-none items-center outline-none"
                placeholder="Escribe un mensaje..."
                placeholderTextColor="rgb(156,163,175)"
                value={input}
                onChangeText={setInput}
              />
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center"
                onPress={recording ? handleStopRecording : handleAudioRecord}
              >
                <MaterialCommunityIcons
                  name={recording ? "stop" : "microphone"}
                  size={20}
                  color="rgb(156,163,175)"
                />
              </TouchableOpacity>
            </View>

            {/* Send Button */}
            <SendButton />
          </View>
        </View>
      </View>

      {/* Camera Modal */}
      {cameraVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={cameraVisible}
          onRequestClose={() => setCameraVisible(false)}
        >
          <View className="flex-1 bg-black">
            <Camera className="flex-1" />
            <TouchableOpacity
              className="absolute top-12 left-4 bg-black/50 p-3 rounded-full"
              onPress={() => setCameraVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
