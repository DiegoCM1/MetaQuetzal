import { View, Text, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import PageTitle from "../components/PageTitle";

// ────────────────── componente principal ──────────────────
export default function AlertInfoScreen({ data }) {
  // Mock por defecto
  const info =
    data || {
      name: "Idalia",
      category: 3,
      updatedAt: "Hace 1 h",
      distanceKm: 185,
      etaHours: 14,
      windKmh: 195,
      gustsKmh: 230,
      pressureMb: 960,
      forwardSpeedKmh: 18,
      localRisk: { extremeWind: 80, waveHeight: 5.4, rainfall24h: 180 },
    };

  // Colores según categoría
  const catColors = {
    1: "bg-yellow-500",
    2: "bg-orange-500",
    3: "bg-red-600",
    4: "bg-red-700",
    5: "bg-purple-700",
  };

  return (
    <ScrollView className="flex-1 bg-phase2bg dark:bg-phase2bgDark">
      <PageTitle>Información de la alerta</PageTitle>

      {/* Encabezado */}
      <View
        className={`rounded-2xl p-5 shadow-lg ${catColors[info.category]} flex-row justify-between items-center mx-4 mt-4`}
      >
        <View>
          <Text className="text-2xl font-extrabold text-white">
            {info.name} • Cat {info.category}
          </Text>
          <Text className="text-white/80 mt-1">
            Actualizado {info.updatedAt}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="weather-hurricane"
          size={36}
          color="white"
        />
      </View>

      {/* RIESGOS LOCALES */}
      <Card title="Riesgos locales">
        <Stat
          label="Prob. viento extremo"
          value={`${info.localRisk.extremeWind}%`}
        />
        <Stat label="Altura de oleaje" value={`${info.localRisk.waveHeight} m`} />
        <Stat label="Lluvia 24 h" value={`${info.localRisk.rainfall24h} mm`} />
      </Card>

      {/* Trayectoria */}
      <Card title="Trayectoria">
        <Text className="text-phase2Titles dark:text-white">
          A <Text className="font-semibold">{info.distanceKm} km</Text> de tu
          ubicación. ETA aproximada en{" "}
          <Text className="font-semibold">{info.etaHours} h</Text>. Ruta
          proyectada mostrada en el mapa principal.
        </Text>
      </Card>

      {/* Datos técnicos */}
      <Card title="Datos técnicos">
        <View className="grid grid-cols-2 gap-2">
          <Stat label="Viento sostenido" value={`${info.windKmh} km/h`} />
          <Stat label="Rachas máx." value={`${info.gustsKmh} km/h`} />
          <Stat label="Presión" value={`${info.pressureMb} mb`} />
          <Stat
            label="Vel. traslación"
            value={`${info.forwardSpeedKmh} km/h`}
          />
        </View>
      </Card>

      {/* Plan de acción */}
      <Card title="Plan de acción">
        <ChecklistItem text="Revisar rutas de evacuación" />
        <ChecklistItem text="Asegurar ventanas y puertas" />
        <ChecklistItem text="Preparar kit de emergencia" />
      </Card>

      {/* Avisos oficiales */}
      <Card title="Avisos oficiales">
        <Text className="text-phase2Titles dark:text-white">
          Último boletín de Conagua ★ NHC indica posible intensificación en las
          próximas 12 h.
        </Text>
      </Card>
    </ScrollView>
  );
}

// ────────────────── helpers ──────────────────
function Card({ title, children }) {
  return (
    <View className="rounded-2xl bg-phase2Cards dark:bg-phase2CardsDark p-5 shadow-md border border-phase2Borders dark:border-phase2BordersDark mx-4 mt-6">
      <Text className="text-xl font-bold text-phase2Titles dark:text-white mb-2">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View className="flex-row justify-between mb-2">
      <Text className="text-phase2Titles dark:text-white/80">{label}</Text>
      <Text className="font-semibold text-phase2Titles dark:text-white">
        {value}
      </Text>
    </View>
  );
}

function ChecklistItem({ text }) {
  return (
    <View className="flex-row items-start space-x-2 mb-2">
      <MaterialCommunityIcons
        name="checkbox-blank-circle-outline"
        size={18}
        color="rgb(115,115,115)"
      />
      <Text className="text-phase2Titles dark:text-white">{text}</Text>
    </View>
  );
}
