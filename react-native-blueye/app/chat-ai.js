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

  return (
    <View className="flex-1 p-4">
      <FlatList
        data={[
          { sender: "user", text: "Hola" },
          { sender: "bot", text: "Hola, ¿en qué puedo ayudarte? Soy una experta en huracanes." },
          {
            sender: "user",
            text: "Escuché que hay un huracán llamado Otis, ¿qué tan peligroso es?",
          },
          {
            sender: "bot",
            text: "Huracán Otis es extremadamente peligroso. Actualmente es categoría 5 y se dirige hacia la costa de Guerrero, México. Se esperan vientos de hasta 260 km/h y lluvias torrenciales. Es importante tomar precauciones inmediatas.",
          },
          { sender: "user", text: "¿Qué áreas están en mayor riesgo?" },
          {
            sender: "bot",
            text: "Las áreas más afectadas serán Acapulco y sus alrededores. También hay riesgo elevado en la región costera de Guerrero y zonas montañosas por deslizamientos de tierra debido a las lluvias intensas.",
          },
          {
            sender: "user",
            text: "¿Qué debo hacer si estoy en Acapulco?",
          },
          {
            sender: "bot",
            text: "Evacúa si las autoridades lo recomiendan. Busca un refugio seguro, alejado de áreas propensas a inundaciones o deslizamientos. Si no puedes evacuar, refúgiate en una zona interior de tu casa, lejos de ventanas. Prepara un kit de emergencia con agua, alimentos, medicinas y documentos importantes.",
          },
          { sender: "user", text: "¿Cuándo se espera que llegue?" },
          {
            sender: "bot",
            text: "El huracán Otis tocará tierra esta noche o en las primeras horas de la madrugada. Las condiciones peligrosas ya podrían estar presentes, como lluvias intensas y fuertes vientos.",
          },
          {
            sender: "user",
            text: "Gracias por la información, seguiré las recomendaciones.",
          },
          {
            sender: "bot",
            text: "De nada, mantente a salvo y sigue las indicaciones de Protección Civil. Estoy aquí si necesitas más información.",
          },
        ]}
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
