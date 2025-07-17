import React from "react";
import { View, Text, ScrollView, Linking, TouchableOpacity } from "react-native";

/**
 * Componente "Acerca de BluEye" — Línea de Tiempo Tecnológica
 * Destaca cómo la tecnología y la innovación impulsan cada hito.
 * Paleta de colores definida en tailwind.config.js (phase2...)
 */

const hitos = [
  {
    fecha: "T3 2024",
    titulo: "Victoria en el Hackathon de Meta",
    descripcion:
      "Nuestro prototipo—alertas tempranas, mapa de riesgo con capas climáticas y chatbot offline potenciado por Llama—se lleva el primer lugar por su potencial de impacto social.",
  },
  {
    fecha: "T1 2025",
    titulo: "Impact Grant PANAM: 100 000 USD",
    descripcion:
      "Meta reconoce nuestro proyecto como uno de los más prometedores de la región PANAM y otorga una beca de USD 100k para escalar la tecnología y llegar a más personas.",
  },
  {
    fecha: "Hoy (T3 2025)",
    titulo: "Construyendo el Futuro",
    descripcion:
      "Estamos afinando modelos multimodales en RunPod, integrando RAG y LlamaGuard, y diseñando una experiencia móvil accesible que pueda salvar vidas en la próxima temporada de huracanes.",
  },
];

const AboutScreen = () => (
  <ScrollView
    className="flex-1 bg-phase2bg dark:bg-phase2bgDark px-6 py-10 mb-6"
    showsVerticalScrollIndicator={false}
  >
    {/* Encabezado motivacional */}
    <Text className="text-2xl font-bold text-phase2Titles dark:text-phase2TitlesDark mb-6">
      Nuestra Historia
    </Text>

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
        ¡Descubre más acerca de BluEye!
      </Text>
    </TouchableOpacity>
  </ScrollView>
);

export default AboutScreen;
