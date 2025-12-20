// Component for displaying an emergency alert modal with options to view on map or get more details. Not displayed on production.
import { useState, useEffect } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Link, useRouter } from "expo-router";
import { colorForLevel } from "../components/AlertCard";

// 5 alertas reales del backend (Huracán Otis)
const MOCK_ALERTS = [
  {
    id: "684e081d-e71f-4137-8d06-7a57ca67da17",
    category: 1,
    title: "Huracán Otis – Alerta",
    message: "Monitoreo preventivo, ciclón a distancia. Manténgase informado y prepare su kit de emergencia.",
    distanceKm: 250,
    etaHours: 36,
  },
  {
    id: "bcab852c-9425-4d9b-afa2-91967b0ecd3f",
    category: 2,
    title: "Huracán Otis – Alerta Verde",
    message: "Mayor vigilancia, condiciones adversas probables. Refuerce ventanas y asegure objetos exteriores.",
    distanceKm: 180,
    etaHours: 24,
  },
  {
    id: "05252d37-9a24-445e-aa4b-8dbe041a256c",
    category: 3,
    title: "Huracán Otis – Alerta Amarilla",
    message: "Condiciones peligrosas, el ciclón se acerca. Prepárate para evacuar y sigue las indicaciones oficiales.",
    distanceKm: 100,
    etaHours: 14,
  },
  {
    id: "7d921fa3-6a6d-4b5b-ba48-539818675a27",
    category: 4,
    title: "Huracán Otis – Alerta Roja",
    message: "¡PELIGRO EXTREMO! Condiciones extremadamente peligrosas en avance. EVACUE INMEDIATAMENTE si está en zona de riesgo.",
    distanceKm: 60,
    etaHours: 8,
  },
  {
    id: "b74faf40-88cd-419f-8c7d-9d2c23ddc43f",
    category: 5,
    title: "Huracán Otis – Impacto Máximo",
    message: "⚠️ ALERTA MÁXIMA ⚠️ Vientos extremos y lluvias torrenciales. Impacto INMINENTE. BUSQUE REFUGIO SEGURO AHORA.",
    distanceKm: 30,
    etaHours: 4,
  },
];

export default function AlarmScreen() {
  const [visible, setVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  useEffect(() => {
    // Seleccionar alerta aleatoria al montar
    const randomIndex = Math.floor(Math.random() * MOCK_ALERTS.length);
    setCurrentAlert(MOCK_ALERTS[randomIndex]);

    const t = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(t);
  }, []);

  const router = useRouter();
  const handleMap = () => {
    setVisible(false);
    router.push("/MapScreen");
  };
  const handleClose = () => setVisible(false);

  // No renderizar hasta tener alerta seleccionada
  if (!currentAlert) return null;

  const baseColor = colorForLevel(currentAlert.category);
  const buttonColor = `${baseColor}50`; // 50 = 31% opacity (semitransparente)
  const categoryBadgeColor = `${baseColor}90`; // 90 = 56% opacity (más visible para el badge)

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleClose}>
      <View className="flex-1 justify-center items-center bg-black/70">
        <View
          className="w-11/12 max-w-md rounded-2xl p-6 shadow-xl bg-white"
          style={{ borderColor: baseColor, borderWidth: 2 }}
        >
          {/* Badge de categoría */}
          <View className="flex-row justify-center mb-4">
            <View
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: categoryBadgeColor }}
            >
              <Text className="text-white font-bold text-sm">
                Categoría {currentAlert.category}
              </Text>
            </View>
          </View>

          {/* Título */}
          <Text className="text-2xl font-extrabold text-center mb-4" style={{ color: '#111827' }}>
            {currentAlert.title}
          </Text>

          {/* Mensaje breve */}
          <Text className="text-base text-center mb-6" style={{ color: '#374151' }}>
            {currentAlert.message}
          </Text>

          {/* Datos clave */}
          {/* <View className="space-y-1 mb-8">
            <Stat label="Distancia" value={`${MOCK_ALERT.distanceKm} km`} />
            <Stat label="ETA" value={`${MOCK_ALERT.etaHours} h`} />
            <Stat label="Viento" value={`${MOCK_ALERT.windKmh} km/h`} />
            <Stat label="Ráfagas" value={`${MOCK_ALERT.gustKmh} km/h`} />
            <Stat label="Presión" value={`${MOCK_ALERT.pressureMb} mb`} />
            <Stat label="Lluvia 1 h" value={`${MOCK_ALERT.rain1h} mm`} />
            <Stat label="Prob. lluvia" value={`${Math.round(MOCK_ALERT.pop * 100)} %`} />
          </View> */}

          {/* Botones */}
          <View className="flex-row justify-between mb-6">
            <TouchableOpacity
              onPress={handleMap}
              className="flex-1 mr-2 py-3 rounded-lg items-center"
              style={{ backgroundColor: buttonColor }}
            >
              <Text className="font-bold" style={{ color: baseColor }}>Ver en el mapa</Text>
            </TouchableOpacity>

            <Link href={`/AlertDetailsScreen?id=${currentAlert.id}`} asChild>
              <TouchableOpacity
                className="flex-1 ml-2 py-3 rounded-lg items-center"
                style={{ backgroundColor: buttonColor }}
              >
                <Text className="font-bold" style={{ color: baseColor }}>Más información</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Cerrar */}
          <TouchableOpacity
            onPress={handleClose}
            className="py-2 rounded-lg items-center border-2"
            style={{ borderColor: baseColor }}
          >
            <Text className="font-bold" style={{ color: baseColor }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <Text className="text-phase2Titles dark:text-phase2TitlesDark">
      <Text className="font-bold">{label}: </Text>
      {value}
    </Text>
  );
}
