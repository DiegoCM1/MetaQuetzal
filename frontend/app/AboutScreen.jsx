import React from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity } from "react-native";

/**
 * Acerca de BluEye — Línea de Tiempo
 * Celebramos la innovación impulsada por personas motivadas y orientadas a resultados.
 * Colores definidos en tailwind.config.js (phase2…)
 */

const hitos = [
  {
    fecha: "Jul‑Sep 2024",
    titulo: "Victoria en el Hackathon de Meta",
    descripcion:
      "Con talento, pasión y tecnología ganamos el primer lugar: alertas tempranas, mapa de riesgo y un chatbot offline potenciado por Llama que prometen salvar vidas.",
  },
  {
    fecha: "Ene‑Mar 2025",
    titulo: "Impact Grant PANAM — 100 000 USD",
    descripcion:
      "Meta respalda nuestra misión con un grant de 100 000 USD para escalar BluEye y proteger a miles de familias en zonas vulnerables.",
  },
  {
    fecha: `A día de hoy (${new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date())})`,
    titulo: "Construyendo el futuro",
    descripcion:
      "Ponemos la IA al servicio de las personas: unimos modelos avanzados de IA con una experiencia móvil realmente accesible para que, juntos, marquemos la diferencia en la próxima temporada de huracanes.",
  },
];

const AboutScreen = () => (
  <ScrollView
    className="flex-1 px-6 py-6 mb-6 bg-white dark:bg-neutral-900"
    showsVerticalScrollIndicator={false}
  >
    {/* Mensaje de bienvenida */}
    <View className="mb-8">
      <Text className="text-base text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark text-center mt-2">
        En BluEye reunimos a personas talentosas y con propósito para que, junto
        a la tecnología, puedas sentirte seguro antes, durante y después de un
        huracán. Tu tranquilidad es nuestro resultado.
      </Text>
    </View>

    {/* Línea de tiempo */}
    <View className="border-l-2 border-phase2Buttons dark:border-phase2ButtonsDark ml-2">
      {hitos.map((hito, idx) => (
        <View key={idx} className="relative pl-6 py-4">
          {/* Punto */}
          <View className="absolute -left-2.5 top-5 w-3 h-3 rounded-full bg-phase2Buttons dark:bg-phase2ButtonsDark" />

          {/* Contenido */}
          <Text className="text-sm font-semibold text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark">
            {hito.fecha}
          </Text>
          <Text className="text-lg font-bold text-phase2Titles dark:text-phase2TitlesDark mt-1">
            {hito.titulo}
          </Text>
          <Text className="text-base text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark mt-1">
            {hito.descripcion}
          </Text>
        </View>
      ))}
    </View>

    {/* Botón al sitio web */}
    <TouchableOpacity
      onPress={() => Linking.openURL("https://blueye-landing.vercel.app/")}
      className="bg-phase2Buttons dark:bg-phase2ButtonsDark px-6 py-3 rounded-full mt-10 self-center shadow-lg active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel="Visitar sitio web de BluEye"
    >
      <Text className="text-base font-semibold text-white">
        ¡Conoce más acerca de nosotros!
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

export default AboutScreen;
