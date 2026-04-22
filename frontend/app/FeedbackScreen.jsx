import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { submitFeedback } from "../services/feedbackService";
import { track } from "../utils/analytics";
import  ScreenHeader from "../components/ScreenHeader"


export default function FeedbackScreen() {
  const { colorScheme } = useColorScheme();
  const [rating, setRating] = useState(0);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validation
  const validate = () => {
    const newErrors = {};
    if (rating === 0)
      newErrors.rating = "Por favor selecciona una calificación.";
    if (!email.trim()) newErrors.email = "El correo es obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(email))
      newErrors.email = "Formato de correo inválido.";
    if (!message.trim()) newErrors.message = "El mensaje no puede estar vacío.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await submitFeedback({ rating, email, message }); // ⬅︎ nuevo
      track("feedback_submit", {
        hasText: message.trim().length > 0,
        length: message.trim().length,
        screen: "FeedbackScreen",
      });

      setSuccess(true);
      setRating(0);
      setEmail("");
      setMessage("");
    } catch (err) {
      Alert.alert("¡Ups!", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={["top", "bottom"]}
    >
      <ScreenHeader title="Feedback" />


      <View className="px-6 py-6">
        <Text className="text-lg text-phase2Titles dark:text-phase2TitlesDark">
          Cuéntanos qué te gusta, qué podemos mejorar o reporta algún error.
        </Text>
      </View>

      <View className="flex-1 p-6">
        {/* Star Rating */}
        <Text className="text-base mb-2 text-phase2Titles dark:text-phase2TitlesDark">
          ¿Cómo nos calificas?
        </Text>
        <View className="flex-row mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <MaterialCommunityIcons
                name={i <= rating ? "star" : "star-outline"}
                size={32}
                color={
                  i <= rating
                    ? "#FFD700"
                    : colorScheme === "dark"
                      ? "#888"
                      : "#ccc"
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        {errors.rating && (
          <Text className="text-red-500 mb-2">{errors.rating}</Text>
        )}

        {/* Email Input */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Correo electrónico"
          className="mb-1 p-3 border rounded-lg bg-white dark:bg-phase2CardsDark border-phase2Borders dark:border-phase2BordersDark text-phase2Titles dark:text-phase2TitlesDark"
        />
        {errors.email && (
          <Text className="text-red-500 mb-2">{errors.email}</Text>
        )}

        {/* Feedback Message */}
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Escribe tus pensamientos..."
          multiline
          numberOfLines={4}
          accessibilityLabel="Mensaje"
          className="mb-4 p-3 border rounded-lg bg-white dark:bg-phase2CardsDark border-phase2Borders dark:border-phase2BordersDark text-phase2Titles dark:text-phase2TitlesDark h-24 text-top"
        />
        {errors.message && (
          <Text className="text-red-500 mb-2">{errors.message}</Text>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`py-3 rounded-lg items-center ${
            loading
              ? "bg-phase2Buttons/50 dark:bg-phase2ButtonsDark/50"
              : "bg-phase2Buttons dark:bg-phase2ButtonsDark"
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-lg font-semibold">Enviar</Text>
          )}
        </TouchableOpacity>

        {/* Success Message */}
        {success && (
          <Text className="mt-4 text-center text-green-600">
            ¡Gracias por tu feedback!
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
