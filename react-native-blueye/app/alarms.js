import "../global.css";
import React, { useState, useEffect } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import HurricaneCategory1 from "../components/hurricane-category-1";
import HurricaneCategory2 from "../components/hurricane-category-2";
import HurricaneCategory3 from "../components/hurricane-category-3";
import HurricaneCategory4 from "../components/hurricane-category-4";
import HurricaneCategory5 from "../components/hurricane-category-5";

export default function AlarmsScreen() {
  const [category, setCategory] = useState(1); // Categoría actual
  const [isHurricaneNearby, setIsHurricaneNearby] = useState(false); // Controla si se muestra la alarma

  // Simula la detección de huracanes cercanos
  const detectNearbyHurricane = async () => {
    const hurricaneData = {
      isNearby: true, // Cambiar a false para simular ausencia de huracanes
      category: Math.floor(Math.random() * 5) + 1, // Categoría aleatoria entre 1 y 5
    };

    if (hurricaneData.isNearby) {
      setCategory(hurricaneData.category); // Actualiza la categoría según los datos
      setIsHurricaneNearby(true); // Activa el modal de alarma
    }
  };

  useEffect(() => {
    const interval = setInterval(detectNearbyHurricane, 3000); // Verifica cada 3 segundos
    return () => clearInterval(interval); // Limpia el intervalo al desmontar
  }, []);

  // Función para determinar el color, texto e instrucciones basados en la categoría con NativeWind
  const getCategoryStyle = () => {
    switch (category) {
      case 1:
        return {
          bgStyle: "bg-phase1bg",
          buttonStyle: "bg-phase1Cards",
          text: "🔔\nHuracán Otis\nCategoría 1",
          instructions:
            "-Mantente informado, pero no hay necesidad de preocuparse por el momento.\n-Monitorea los reportes meteorológicos oficiales y sigue las indicaciones de Protección Civil.\n-Asegúrate de tener una forma de comunicación, como una radio con baterías, en caso de emergencias.",
          details:
            "Comunicado No. 001\nEmitido el 2023-10-23 a las 10:00 AM.",
        };
      case 2:
        return {
          bgStyle: "bg-phase2bg",
          buttonStyle: "bg-phase2Buttons",
          text: "🔔\nHuracán Otis\nCategoría 2",
          instructions:
            "-Otis podría instensificarse rápidamente.\n-Tome precaución.\n-Revise suministros y prepárese para posibles evacuaciones.\n-Manténgase atento a los comunicados de CONAGUA y Protección Civil.\n-Evite actividades al aire libre y asegure objetos en el exterior de su hogar."
,
          details:
            "Comunicado No. 002\nEmitido el 2023-10-23 a las 1:00 PM.",
        };
      case 3:
        return {
          bgStyle: "bg-phase3bg",
          buttonStyle: "bg-phase3Cards",
          text: "⚠️\nHuracán Otis\nCategoría 3",
          instructions:
            "-Otis se ha intensificado rápidamente.\n-Tome medidas de protección.\n-Asegúrese de tener documentos importantes en un lugar seguro y listo para llevar.\n-Asegure su propiedad.\n-Prepárese para evacuaciones.\n-Otis presenta vientos sostenidos de 195 km/h y ráfagas más fuertes.\n-Se esperan olas de hasta 4 metros en las costas de Guerrero y Oaxaca.",
          details:
            "Comunicado No. 003\nEmitido el 2023-10-23 a las 4:00 PM.",
        };
      case 4:
        return {
          bgStyle: "bg-phase4bg",
          buttonStyle: "bg-phase4Cards",
          text: "⚠️\nHuracán Otis\nCategoría 4",
          instructions:
            "-Por la madrugada del 25 de octubre, Otis tocará tierra como huracán categoría 5.\n-Prepárese para evacuar.\n-Siga las instrucciones de las autoridades locales.\n-Con presión central de 923 hPa y vientos sostenidos de 250 km/h, Otis representa un peligro extremo.\n-Se esperan marejadas ciclónicas con olas de hasta 6 metros y lluvias torrenciales que pueden causar inundaciones y deslaves."
,
          details:
            "Comunicado No. 004\nEmitido el 2023-10-24 a las 7:00 PM.",
        };
      case 5:
        return {
          bgStyle: "bg-phase5bg",
          buttonStyle: "bg-phase5Cards",
          text: "⚠️\nHuracán Otis\nCategoría 5",
          instructions:
            "-Huracán Otis está acercándose y llegará a tierra dentro de las próximas 2 a 3 horas.\n-Evacuación obligatoria.\n-Siga las instrucciones oficiales de inmediato.\n-En el comunicado oficial, se informó que impactará cerca de Acapulco, Guerrero, con vientos sostenidos de hasta 270 km/h y olas de hasta 6 metros.\n-Diríjase a refugios temporales designados y lleve un kit de emergencia.",
          details:
            "Comunicado No. 005\nEmitido el 2023-10-24 a las 10:00 PM.",
        };
      default:
        return {
          bgStyle: "bg-gray-500",
          buttonStyle: "bg-gray-700",
          text: "Categoría desconocida",
          instructions: "Información no disponible.",
          details: "Detalles no disponibles.",
        };
    }    
  };

  // Renderiza el componente basado en la categoría
  const renderCategory = () => {
    switch (category) {
      case 1:
        return <HurricaneCategory1 />;
      case 2:
        return <HurricaneCategory2 />;
      case 3:
        return <HurricaneCategory3 />;
      case 4:
        return <HurricaneCategory4 />;
      case 5:
        return <HurricaneCategory5 />;
      default:
        return (
          <View className="flex-1 justify-center items-center bg-gray-100">
            <Text className="text-lg text-gray-500">
              Selecciona una categoría válida.
            </Text>
          </View>
        );
    }
  };

  const categoryStyle = getCategoryStyle();

  return (
    <View className="flex-1 bg-white">
      <Text className="text-xl font-bold text-center my-4">
        Información de Huracanes
      </Text>

      {/* Renderiza el componente correspondiente */}
      {renderCategory()}

      {/* Alert structure */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isHurricaneNearby}
        onRequestClose={() => setIsHurricaneNearby(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View
            className={`w-4/5 p-5 rounded-xl items-center shadow-lg ${categoryStyle.bgStyle}`}
          >
            <Text className="text-6xl font-bold text-phase2Titles text-center mb-2">
            </Text>
            <Text className="text-2xl font-bold mb-10 text-phase2Titles text-center">
              {categoryStyle.text}
            </Text>
            <Text className="text-phase2Titles mb-7 text-lg w-5/6">
              {categoryStyle.instructions}
            </Text>
            <View className="flex-row pb-4 w-5/6 justify-between mb-5">
              <Link href="/">
                <TouchableOpacity
                  className={`py-2 px-5 rounded-lg w-32 h-24 justify-center items-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${categoryStyle.buttonStyle}`}
                >
                  <Text className="font-bold text-phase2Titles text-center text-lg">
                    Más información
                  </Text>
                </TouchableOpacity>
              </Link>

              <Link href="/chat-ai">
                <TouchableOpacity
                  className={`py-2 px-5 rounded-lg w-32 h-24 justify-center items-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${categoryStyle.buttonStyle}`}
                >
                  <Text className="font-bold text-phase2Titles text-center text-lg">
                    Ir al chatbot
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Text className="text-sm text-phase2Titles italic w-5/6 mb-5">
              {categoryStyle.details}
            </Text>

            <TouchableOpacity
              className="bg-white py-2 px-5 rounded-md shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              onPress={() => setIsHurricaneNearby(false)}
            >
              <Text className="font-bold text-phase2Titles">Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
