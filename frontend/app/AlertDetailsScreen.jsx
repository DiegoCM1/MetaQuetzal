// frontend/app/AlertDetailsScreen.jsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "../utils/date";
import { colorForLevel } from "../components/AlertCard";
import { track } from "../utils/analytics";

const API_URL = "https://metaquetzal-production.up.railway.app";

export default function AlertDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [alert, setAlert] = useState(null);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState(null);

  const handleOpenBoletin = async () => {
    const url = "https://preparados.gob.mx/SIAT-CT/";
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error opening URL:", error);
    }
  };

  /* fetch */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/alerts/${id}`);
        if (!res.ok)
          throw Object.assign(new Error("Error"), { status: res.status });
        const data = await res.json();
        if (live) setAlert(data);
      } catch (e) {
        if (live) setError(e);
      } finally {
        if (live) setLoad(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [id]);

  useEffect(() => {
    if (alert) {
      track("alert_details_view", {
        alertId: String(alert.id),
        level: Number(alert.level),
        score: Number(alert.score ?? 0),
      });
    }
  }, [alert]);

  /* estados */
  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator />
      </View>
    );

  if (error)
    return (
      <View className="flex-1 justify-center items-center">
        <Text>
          {error.status === 404
            ? "Alerta no encontrada"
            : "Error al cargar alerta"}
        </Text>
      </View>
    );

  /* UI */
  const baseColor = colorForLevel(alert.level);
  const bannerColor = `${baseColor}80`;

  return (
    <View
      className="flex-1 bg-white dark:bg-neutral-900"
    >
      {/* banner */}
      <View
        style={{ backgroundColor: bannerColor }}
        className="pt-10 pb-6 px-5 items-center rounded-b-md"
      >
        <MaterialCommunityIcons
          name="weather-hurricane"
          size={42}
          color="#fff"
        />
        <Text className="text-white font-bold text-2xl text-center mt-2">
          {alert.title}
        </Text>
        <Text className="text-white text-sm mt-1">
          {dayjs(alert.timestamp).format("DD/MM/YYYY HH:mm")}
        </Text>
      </View>

      {/* contenido */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 18 }}
      >
        {/* descripción */}
        {alert.short && (
          <Text className="text-lg text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark">
            {alert.short}
          </Text>
        )}

        {/* métricas */}
        <View className="flex-row justify-around bg-neutral-100 dark:bg-neutral-800 rounded-xl p-4">
          <View className="items-center">
            <Text className="font-bold text-lg text-phase2Titles dark:text-phase2TitlesDark">
              {alert.level}
            </Text>
            <Text className="text-xs text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark">
              Nivel de categoría
            </Text>
          </View>
        </View>

        {/* recomendaciones */}
        {alert.recommendations?.length > 0 && (
          <View>
            <Text className="font-bold mb-2 dark:text-phase2TitlesDark">
              Recomendaciones
            </Text>
            {alert.recommendations.map((r, i) => (
              <Text
                key={i}
                className="mb-1 text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark"
              >
                • {r}
              </Text>
            ))}
          </View>
        )}

        {/* factores */}
        {alert.factors?.length > 0 && (
          <View>
            <Text className="font-bold mb-2 mt-2 dark:text-phase2TitlesDark">
              Factores
            </Text>
            {alert.factors.map((f, i) => (
              <Text
                key={i}
                className="mb-1 text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark"
              >
                • {f}
              </Text>
            ))}
          </View>
        )}

        {/* id */}
        {/* <Text className="text-xs text-neutral-500 dark:text-phase2SecondaryTxtDark mt-4">
          ID: {alert.id}
        </Text> */}
      </ScrollView>

      {/* acciones */}
      <View className="px-4 pb-6 flex-row justify-between gap-3">
        <TouchableOpacity
          className="flex-1 bg-phase2Buttons dark:bg-phase2CardsDark rounded-2xl py-3 items-center"
          android_ripple={{ color: "#ffffff33" }}
          onPress={() => {
            track("details_map_tap", {
              alertId: String(alert.id),
              level: Number(alert.level),
              score: Number(alert.score ?? 0),
            });
            router.push("/MapScreen");
          }}
        >
          <Text className="text-white dark:text-phase2TitlesDark font-bold">
            Ver en mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-phase2Buttons dark:bg-phase2CardsDark rounded-2xl py-3 items-center"
          android_ripple={{ color: "#ffffff33" }}
          onPress={() => {
            track("details_boletin_tap", {
              alertId: String(alert.id),
              level: Number(alert.level),
              score: Number(alert.score ?? 0),
            });
            handleOpenBoletin();
          }}
        >
          <Text className="text-white dark:text-phase2TitlesDark font-bold">
            Ver Boletín oficial
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
