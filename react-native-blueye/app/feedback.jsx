// feedback.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import PageTitle from "../components/PageTitle";

const API_URL = "https://your-api.com/feedback"; // ← replace with your real endpoint

export default function Feedback() {
  const { colorScheme } = useColorScheme();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Basic client-side validation
  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "El nombre es obligatorio.";
    if (!form.email.trim()) newErrors.email = "El correo es obligatorio.";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Formato de correo inválido.";
    if (!form.message.trim())
      newErrors.message = "El mensaje no puede estar vacío.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update form state and clear field error
  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Error en el servidor");

      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      Alert.alert("¡Ups!", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <PageTitle>Déjanos tu feedback</PageTitle>

      <View className="flex-1 p-6">
        {/* Nombre */}
        <TextInput
          value={form.name}
          onChangeText={(t) => handleChange("name", t)}
          placeholder="Nombre"
          accessibilityLabel="Nombre"
          className="mb-1 p-3 border rounded-lg bg-white dark:bg-phase2CardsDark border-phase2Borders dark:border-phase2BordersDark text-phase2Titles dark:text-phase2TitlesDark"
        />
        {errors.name && <Text className="text-red-500 mb-2">{errors.name}</Text>}

        {/* Correo */}
        <TextInput
          value={form.email}
          onChangeText={(t) => handleChange("email", t)}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Correo electrónico"
          className="mb-1 p-3 border rounded-lg bg-white dark:bg-phase2CardsDark border-phase2Borders dark:border-phase2BordersDark text-phase2Titles dark:text-phase2TitlesDark"
        />
        {errors.email && <Text className="text-red-500 mb-2">{errors.email}</Text>}

        {/* Mensaje */}
        <TextInput
          value={form.message}
          onChangeText={(t) => handleChange("message", t)}
          placeholder="Escribe tu mensaje..."
          multiline
          numberOfLines={4}
          accessibilityLabel="Mensaje"
          className="mb-4 p-3 border rounded-lg bg-white dark:bg-phase2CardsDark border-phase2Borders dark:border-phase2BordersDark text-phase2Titles dark:text-phase2TitlesDark h-24 text-top"
        />
        {errors.message && (
          <Text className="text-red-500 mb-2">{errors.message}</Text>
        )}

        {/* Enviar */}
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

        {/* Mensaje de éxito */}
        {success && (
          <Text className="mt-4 text-center text-green-600">
            ¡Gracias por tu feedback!
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
