import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "../../utils/date";
import { colorForLevel } from "./_components/AlertCard";
import { track } from "../../utils/analytics";
import { authFetch } from '../../utils/api'
import { API_BASE_URL } from '../../utils/config'
import  ScreenHeader from "../../components/ScreenHeader"


interface AlertData {
  id: string;
  level: number;
  title: string;
  short?: string;
  timestamp: string;
  score?: number;
  recommendations?: string[];
  factors?: string[];
}

export default function AlertDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [alert, setAlert] = useState<AlertData | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState<{ status?: number } | null>(null);

  const handleOpenBoletin = async () => {
    const url = "https://preparados.gob.mx/SIAT-CT/";
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error("Error opening URL:", err);
    }
  };

  useEffect(() => {
    let live = true;
    (async () => {
      const url = `${API_BASE_URL}/api/v1/alerts/${id}`
      try {
        const res = await authFetch(url);
        if (!res.ok) {
          const body = await res.text()
          console.error(`[AlertDetails] HTTP ${res.status} | id: ${id} | url: ${url} | body: ${body}`)
          throw Object.assign(new Error("Error"), { status: res.status });
        }
        const data = await res.json();
        if (live) setAlert(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        const isAuthError = msg === 'Not authenticated'
        console.error(`[AlertDetails] fetch failed | stage: ${isAuthError ? 'token' : 'request'} | id: ${id} | error: ${msg}`)
        if (live) setError(e as { status?: number });
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-transparent">
        <Text className="">
          {error.status === 404
            ? "Alerta no encontrada"
            : "Error al cargar alerta"}
        </Text>
      </View>
    );
  }

  if (!alert) return null;

  const baseColor = colorForLevel(alert.level);
  const bannerColor = `${baseColor}80`;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-transparent">
      <ScreenHeader title="Detalles de alerta" />
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
          <Text className="text-lg text-phase2SecondaryTxt">
            {alert.short}
          </Text>
        )}

        {/* métricas */}
        <View className="flex-row justify-around bg-neutral-100 rounded-xl p-4">
          <View className="items-center">
            <Text className="font-bold text-lg text-phase2Titles">
              {alert.level}
            </Text>
            <Text className="text-xs text-phase2SecondaryTxt">
              Nivel de categoría
            </Text>
          </View>
        </View>

        {/* recomendaciones */}
        {alert.recommendations && alert.recommendations.length > 0 && (
          <View>
            <Text className="font-bold mb-2">
              Recomendaciones
            </Text>
            {alert.recommendations.map((r, i) => (
              <Text
                key={i}
                className="mb-1 text-phase2SecondaryTxt"
              >
                • {r}
              </Text>
            ))}
          </View>
        )}

        {/* factores */}
        {alert.factors && alert.factors.length > 0 && (
          <View>
            <Text className="font-bold mb-2 mt-2">
              Factores
            </Text>
            {alert.factors.map((f, i) => (
              <Text
                key={i}
                className="mb-1 text-phase2SecondaryTxt"
              >
                • {f}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      {/* acciones */}
      <View className="px-4 pb-6 flex-row justify-between gap-3">
        <TouchableOpacity
          className="flex-1 bg-phase2Buttons rounded-2xl py-3 items-center"
          activeOpacity={0.7}
          onPress={() => {
            track("details_map_tap", {
              alertId: String(alert.id),
              level: Number(alert.level),
              score: Number(alert.score ?? 0),
            });
            router.push("/(tabs)/MapScreen");
          }}
        >
          <Text className="text-white font-bold">
            Ver en mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-phase2Buttons rounded-2xl py-3 items-center"
          activeOpacity={0.7}
          onPress={() => {
            track("details_boletin_tap", {
              alertId: String(alert.id),
              level: Number(alert.level),
              score: Number(alert.score ?? 0),
            });
            handleOpenBoletin();
          }}
        >
          <Text className="text-white font-bold">
            Ver Boletín oficial
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
