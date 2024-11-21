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
import { Audio } from "expo-av";

export default function ChatScreen() {
  const [cameraPermission, setCameraPermission] = useState(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [recording, setRecording] = useState(null);

  // Manejar la solicitud de permisos y apertura de la cámara
  const handleOpenCamera = async () => {
    if (cameraPermission === null) {
      // Solicitar permisos de cámara
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

    // Mostrar la cámara
    setCameraVisible(true);
  };

  // Manejar la selección de imágenes desde la galería
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

  // Manejar la grabación de audio
  const handleAudioRecord = async () => {
    try {
      // Solicitar permiso para grabar audio
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Por favor habilita el acceso al micrófono."
        );
        return;
      }

      // Iniciar grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      Alert.alert("Grabando", "La grabación de audio ha comenzado.");
    } catch (err) {
      console.error("Error al grabar audio:", err);
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      // Detener grabación
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); // Obtener la URI del archivo grabado
      setRecording(null);
      Alert.alert("Grabación completa", `Audio guardado en: ${uri}`);
    } catch (err) {
      console.error("Error al detener la grabación:", err);
    }
  };

  return (
    <View className="flex-1 bg-gray-100 p-4">
      <FlatList
        data={[
          { sender: "user", text: "Hola" },
          { sender: "bot", text: "Hola, ¿en qué puedo ayudarte?" },
          {
            sender: "user",
            text: "Escuché que se aproxima un huracán, cuentame más",
          },
          {
            sender: "bot",
            text: "Huracán categoría 5 en Acapulco - Pasos rápidos: Evacúa si puedes, ve a un refugio temporal, consulta rutas de evacuación y sigue indicaciones oficiales. Contactos útiles: Protección Civil 744 483 8328 / 911, Bomberos 744 484 4122, CFE 071. Apaga gas y luz, guarda documentos importantes en bolsas impermeables, ten agua, comida, linterna, botiquín y radio. Durante el huracán, refúgiate en una habitación interior, lejos de ventanas, mantén la calma y sigue noticias oficiales. Después, sal solo cuando sea seguro, reporta emergencias y evita áreas peligrosas.",
          },
          { sender: "user", text: "Okay, muchas gracias!" },
          {
            sender: "bot",
            text: "De nada, si tienes más dudas estoy aquí para ayudarte! :)",
          },
        ]}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View
            className={`mb-2 ${item.sender === "user" ? "items-end" : "items-start"}`}
          >
            <Text
              className={`p-3 rounded-lg ${item.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}
            >
              {item.text}
            </Text>
          </View>
        )}
      />
      <View className="flex-row items-center mt-4">
        <TouchableOpacity
          className="bg-blue-500 py-2 px-4 rounded-lg"
          onPress={handleOpenCamera}
        >
          <MaterialCommunityIcons name="camera" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-blue-500 py-2 px-4 rounded-lg ml-2 mr-2"
          onPress={handlePickImage}
        >
          <MaterialCommunityIcons name="folder-image" size={20} color="white" />
        </TouchableOpacity>
        <TextInput
          className="flex-1 border border-gray-300 rounded-lg p-2"
          placeholder="Escribe un mensaje..."
        />
        <TouchableOpacity
          className="bg-blue-500 py-2 px-4 rounded-lg ml-2"
          onPress={recording ? handleStopRecording : handleAudioRecord}
        >
          <MaterialCommunityIcons
            name={recording ? "stop" : "microphone"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Modal para la cámara */}
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
