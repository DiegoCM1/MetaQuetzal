import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { submitFeedback } from "../services/feedbackService";
import { track } from "../utils/analytics";
import ScreenHeader from "../components/ScreenHeader"
import { colors, fonts } from "../utils/theme"


export default function FeedbackScreen() {
  const { colorScheme } = useTheme();
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
      className="flex-1 bg-transparent"
      edges={["top", "bottom"]}
    >
      <ScreenHeader title="Feedback" />


      <View className="px-6 py-6">
        <Text className="text-base font-poppins text-white/70">
          Cuéntanos qué te gusta, qué podemos mejorar o reporta algún error.
        </Text>
      </View>

      <View className="flex-1 p-6">
        {/* Star Rating */}
        <Text className="text-base font-poppins-semibold mb-2 text-white">
          ¿Cómo nos calificas?
        </Text>
        <View className="flex-row mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i)}>
              <MaterialCommunityIcons
                name={i <= rating ? "star" : "star-outline"}
                size={32}
                color={i <= rating ? colors.brandYellow : "rgba(255,255,255,0.25)"}
              />
            </TouchableOpacity>
          ))}
        </View>
        {errors.rating && (
          <Text className="text-brand-red font-poppins mb-2">{errors.rating}</Text>
        )}

        {/* Email Input */}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Correo electrónico"
          className="mb-1 p-3 border rounded-lg"
          style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(10,28,50,0.6)', color: 'white', fontFamily: fonts.poppins }}
        />
        {errors.email && (
          <Text className="text-brand-red font-poppins mb-2">{errors.email}</Text>
        )}

        {/* Feedback Message */}
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Escribe tus pensamientos..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          accessibilityLabel="Mensaje"
          className="mb-4 p-3 border rounded-lg h-24"
          style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(10,28,50,0.6)', color: 'white', fontFamily: fonts.poppins }}
        />
        {errors.message && (
          <Text className="text-brand-red font-poppins mb-2">{errors.message}</Text>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="py-3 rounded-full items-center"
          style={{ backgroundColor: loading ? `${colors.brandBlue}80` : colors.brandBlue }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-poppins-semibold text-base uppercase">Enviar</Text>
          )}
        </TouchableOpacity>

        {/* Success Message */}
        {success && (
          <Text className="mt-4 text-center font-poppins text-brand-green">
            ¡Gracias por tu feedback!
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
