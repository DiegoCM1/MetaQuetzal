import { View, Text, TouchableOpacity, Linking } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { track } from "../../../utils/analytics";
import { fonts } from "../../../utils/theme";
import { colorForLevel, labelForLevel } from "./AlertCard";
import type { SMNCycloneAdvisory } from "../_types";

const OCEAN_LABEL: Record<string, string> = {
  atlantico: "Océano Atlántico",
  pacifico: "Océano Pacífico",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginRight: 20, marginBottom: 8 }}>
      <Text
        style={{
          color: "rgba(255,255,255,0.5)",
          fontFamily: fonts.poppins,
          fontSize: 11,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: "white",
          fontFamily: fonts.poppinsSemiBold,
          fontSize: 15,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default function CycloneAdvisoryCard({
  advisory,
}: {
  advisory: SMNCycloneAdvisory;
}) {
  const baseColor = colorForLevel(advisory.level);
  const oceanLabel = advisory.ocean
    ? (OCEAN_LABEL[advisory.ocean] ?? advisory.ocean)
    : "SMN";

  const handleOpenPdf = async () => {
    if (!advisory.pdf_url) return;
    track("cyclone_advisory_pdf_tap", {
      system: advisory.system_name ?? "unknown",
      ocean: advisory.ocean ?? "unknown",
    });
    try {
      const canOpen = await Linking.canOpenURL(advisory.pdf_url);
      if (canOpen) await Linking.openURL(advisory.pdf_url);
    } catch (err) {
      console.error("[CycloneAdvisoryCard] openURL error:", err);
    }
  };

  return (
    <View
      style={{
        backgroundColor: "rgba(10, 28, 50, 0.6)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${baseColor}55`,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <MaterialCommunityIcons
            name="weather-hurricane"
            size={28}
            color={baseColor}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: fonts.poppins,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {oceanLabel}
              {advisory.aviso_num ? ` · Aviso #${advisory.aviso_num}` : ""}
            </Text>
            <Text
              style={{
                color: "white",
                fontFamily: fonts.poppinsSemiBold,
                fontSize: 17,
              }}
            >
              {advisory.system_name ?? "Sistema ciclónico"}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: baseColor,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: "white",
              fontFamily: fonts.poppinsSemiBold,
              fontSize: 11,
            }}
          >
            {labelForLevel(advisory.level)}
          </Text>
        </View>
      </View>

      {/* Síntesis oficial */}
      {advisory.synthesis && (
        <Text
          style={{
            color: "rgba(255,255,255,0.85)",
            fontFamily: fonts.poppins,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 10,
          }}
        >
          {advisory.synthesis}
        </Text>
      )}

      {/* Stats */}
      <View className="flex-row flex-wrap">
        {advisory.location_text && (
          <Stat label="Distancia" value={advisory.location_text} />
        )}
        {advisory.wind_sustained_kmh != null && (
          <Stat
            label="Viento sostenido"
            value={`${advisory.wind_sustained_kmh} km/h`}
          />
        )}
        {advisory.wind_gusts_kmh != null && (
          <Stat label="Rachas" value={`${advisory.wind_gusts_kmh} km/h`} />
        )}
        {advisory.pressure_hpa != null && (
          <Stat label="Presión" value={`${advisory.pressure_hpa} hPa`} />
        )}
      </View>
      {advisory.movement_text && (
        <Text
          style={{
            color: "rgba(255,255,255,0.6)",
            fontFamily: fonts.poppins,
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          Desplazamiento: {advisory.movement_text}
        </Text>
      )}

      {/* Recomendaciones oficiales */}
      {advisory.recommendations && (
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: 10,
            marginBottom: advisory.pdf_url ? 10 : 0,
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.5)",
              fontFamily: fonts.poppins,
              fontSize: 11,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Recomendaciones oficiales
          </Text>
          <Text
            style={{
              color: "white",
              fontFamily: fonts.poppins,
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {advisory.recommendations}
          </Text>
        </View>
      )}

      {advisory.pdf_url && (
        <TouchableOpacity
          onPress={handleOpenPdf}
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <MaterialCommunityIcons
            name="file-pdf-box"
            size={18}
            color={baseColor}
          />
          <Text
            style={{
              color: baseColor,
              fontFamily: fonts.poppinsSemiBold,
              fontSize: 13,
              marginLeft: 6,
            }}
          >
            Ver aviso oficial (PDF)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
