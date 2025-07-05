// components/alarmScreen.jsx
import { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";

/* Colores base Tailwind para cada categoría (puedes cambiarlos) */
const CATEGORY_BG = {
  3: "bg-phase3bg",
  4: "bg-phase4bg",
  5: "bg-phase5bg",
};

/* Datos mock del huracán cercano */
const MOCK_ALERT = {
  category: 3,
  title: "Huracán Otis · Categoría 3",
  message:
    "Otis se acerca. Vientos sostenidos de 195 km/h. Prepárese para evacuar.",
};

export default function AlarmScreenMock() {
  /* 1️⃣ Visibilidad controlada internamente */
  const [visible, setVisible] = useState(false);

  /* 2️⃣ Simula que “detectamos” un huracán al abrir la pantalla */
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 250); // 0.25 s
    return () => clearTimeout(timer);
  }, []);

  const router = useRouter();

  /* 3️⃣ Handlers */
  const handleMap = () => {
    setVisible(false);
    router.push("/"); // o tu ruta de mapa
  };

  const handleClose = () => setVisible(false);

  /* 4️⃣ Render del modal */
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View className="flex-1 justify-center items-center bg-black/70">
        <View
          className={`w-11/12 max-w-md rounded-2xl p-6 shadow-xl ${
            CATEGORY_BG[MOCK_ALERT.category]
          }`}
        >
          {/* Título */}
          <Text className="text-2xl font-extrabold text-phase2Titles text-center mb-4">
            {MOCK_ALERT.title}
          </Text>

          {/* Mensaje */}
          <Text className="text-base text-phase2Titles text-center mb-8">
            {MOCK_ALERT.message}
          </Text>

          {/* Botones acción */}
          <View className="flex-row justify-between mb-6">
            <TouchableOpacity
              onPress={handleMap}
              className="flex-1 mr-2 py-3 rounded-lg bg-white/60 items-center"
            >
              <Text className="font-bold text-phase2Titles">Ver en el mapa</Text>
            </TouchableOpacity>

            <Link href="/alerts-info" asChild>
              <TouchableOpacity className="flex-1 ml-2 py-3 rounded-lg bg-white/60 items-center">
                <Text className="font-bold text-phase2Titles">Más información</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Cerrar */}
          <TouchableOpacity
            onPress={handleClose}
            className="py-2 rounded-lg bg-white items-center"
          >
            <Text className="font-bold text-phase2Titles">Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
