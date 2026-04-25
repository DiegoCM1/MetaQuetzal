import { View, Text, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs from "../../../utils/date";
import { track } from "../../../utils/analytics";
import { colors } from '../../../utils/theme';


// TODO: replace with backend field once AlertDetail exposes SIAT label
export const labelForLevel = (l: number): string =>
  ({
    1: 'Aviso',
    2: 'Prevención',
    3: 'Preparación',
    4: 'Alarma',
    5: 'Afectación',
  })[l] || 'Desconocido';

export const colorForLevel = (l: number): string =>
  ({
    1: colors.brandTeal,
    2: colors.brandGreen,
    3: colors.brandYellow,
    4: colors.brandOrange,
    5: colors.brandRed,
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
  const { level, title, short: description, timestamp } = alert;

  const bannerColor = `${colorForLevel(level)}50`;
  const iconColor = colorForLevel(level);

  return (
    <Pressable
      className="w-full border-b rounded-lg mb-2"
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
          color={iconColor}
        />
        <Text className="flex-1 text-lg font-poppins-semibold ml-2 text-white">
          {title}
        </Text>
        <Text className="text-xs font-poppins text-white/60 text-right">
          {dayjs(timestamp).fromNow()}
        </Text>
      </View>

      {/* descripción */}
      <View className="flex-row items-start px-4 pb-4">
        <Text className="text-sm font-poppins w-5/6 text-white/80 pr-2">
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
