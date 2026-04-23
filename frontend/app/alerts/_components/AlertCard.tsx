import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "../../../utils/date";
import { track } from "../../../utils/analytics";

export const colorForLevel = (l: number): string =>
  ({
    1: "#22C55E", // verde
    2: "#15803D", // verde oscuro
    3: "#FACC15", // amarillo
    4: "#EF4444", // rojo
    5: "#C026D3", // morado
  })[l] || "#6B7280";

interface Alert {
  id: string | number;
  level: number;
  title: string;
  short?: string;
  timestamp: string;
  score?: number;
}

interface AlertCardProps {
  alert: Alert;
  onPress?: () => void;
}

export default function AlertCard({ alert, onPress }: AlertCardProps) {
  const { id, level, title, short: description, timestamp } = alert;

  const bannerColor = `${colorForLevel(level)}33`;

  return (
    <Pressable
      className="w-full border-b border-b-gray-200 rounded-lg mb-2"
      style={{ backgroundColor: bannerColor }}
      android_ripple={{ color: "#ccc" }}
      onPress={() => {
        track("alert_card_tap", {
          alertId: String(alert.id),
          level: Number(alert.level),
          score: Number(alert.score ?? 0),
        });
        onPress?.();
      }}
    >
      {/* fila título + icono + tiempo */}
      <View className="flex-row items-center justify-between p-4">
        <MaterialCommunityIcons
          name="weather-hurricane"
          size={32}
          color="#38bdf8"
        />
        <Text className="flex-1 text-xl font-bold ml-2">
          {title}
        </Text>
        <Text className="text-base text-right text-phase2SecondaryTxt">
          {dayjs(timestamp).fromNow()}
        </Text>
      </View>

      {/* descripción */}
      <View className="flex-row items-start px-4 pb-4">
        <Text className="text-base w-5/6 text-phase2SecondaryTxt pr-2">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
