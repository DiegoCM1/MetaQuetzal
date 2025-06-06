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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { Audio } from 'expo-audio';
import { sendMessage } from "../api/sendMessage";

export default function ChatScreen() {
  // Permissions and state handlers
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [recording, setRecording] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  // Camera permission and open handler
  const handleOpenCamera = async () => {
    if (cameraPermission === null) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Por favor habilita el acceso a la cámara.");
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
      Alert.alert("Permiso denegado", "Por favor habilita el acceso a la galería.");
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
        Alert.alert("Permiso denegado", "Por favor habilita el acceso al micrófono.");
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

  // Send text to AI and handle response
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    const aiResponse = await sendMessage(userMessage.text);
    const botMessage = { sender: "bot", text: aiResponse };
    setMessages(prev => [...prev, botMessage]);
  };

  return (
    <View className="flex-1 p-4">
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            className={`mb-2 ${
              item.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <Text
              className={`p-3 rounded-lg text-phase2Titles ${
                item.sender === "user"
                  ? "bg-phase2Buttons text-white"
                  : "bg-phase2Cards"
              }`}
            >
              {item.text}
            </Text>
          </View>
        )}
      />
      <View className="flex-row items-center mt-4">
        <TouchableOpacity
          className="bg-phase2Buttons dark:bg-phase2ButtonsDark py-2 px-4 rounded-lg"
          onPress={handleOpenCamera}
        >
          <MaterialCommunityIcons name="camera" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-phase2Buttons dark:bg-phase2ButtonsDark py-2 px-4 rounded-lg mx-2"
          onPress={handlePickImage}
        >
          <MaterialCommunityIcons name="folder-image" size={20} color="white" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 border border-phase2Borders dark:border-phase2BordersDark rounded-lg p-2 bg-white dark:bg-phase2Cards text-phase2Titles"
          placeholder="Escribe un mensaje..."
          placeholderTextColor="rgb(120,120,120)"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          className="bg-phase2Buttons dark:bg-phase2ButtonsDark py-2 px-4 rounded-lg ml-2"
          onPress={recording ? handleStopRecording : handleAudioRecord}
        >
          <MaterialCommunityIcons
            name={recording ? "stop" : "microphone"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-phase2Buttons dark:bg-phase2ButtonsDark py-2 px-4 rounded-lg ml-2"
          onPress={handleSendMessage}
        >
          <MaterialCommunityIcons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {cameraVisible && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={cameraVisible}
          onRequestClose={() => setCameraVisible(false)}
        >
          <Camera style={{ flex: 1 }} />
          <TouchableOpacity
            style={{
              position: "absolute",
              top: 40,
              left: 20,
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: 10,
              borderRadius: 10,
            }}
            onPress={() => setCameraVisible(false)}
          >
            <Text style={{ color: "white" }}>Cerrar</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}
