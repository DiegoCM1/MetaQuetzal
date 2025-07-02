import { StatusBar } from "expo-status-bar";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const Alert = ({ header, description, icon, onSelect }) => (
  <View className="p-4 w-full border-y border-x-0">
    <View className="flex-row items-center">
      <MaterialCommunityIcons
        name={icon}
        size={32}
        color="rgb(50, 180, 200)" // phase2Buttons
      />
      <Text className="text-xl font-bold text-phase2Titles dark:text-phase2TitlesDark ml-2">
        {header}
      </Text>
    </View>
    <View className="flex flex-row">
      <Text className="text-base text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark my-2">
        {description}
      </Text>
      <TouchableOpacity
        className="bg-phase2Buttons dark:bg-phase2ButtonsDark rounded-lg py-3 items-center mt-4"
        onPress={onSelect}
      >
        <Text className="text-phase2SmallTxt dark:text-phase2TitlesDark font-bold text-base px-2">
          Ver en mapa
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 px-5">
      <StatusBar style="light" />
      <Text className="text-2xl font-bold text-phase2Titles dark:text-phase2TitlesDark text-center my-5">
        Historial de alertas
      </Text>
      <View className="flex-1 items-center">
        <Alert
          header="Huracan 1"
          description="Accede a todas las funciones premium con soporte dedicado y más."
          icon="antenna"
          onSelect={() =>
            router.push({ pathname: "/payment", params: { plan: "Plan Pro" } })
          }
        />
        <Alert
          header="Huracan 2"
          description="Disfruta de funciones esenciales para empezar."
          icon="antenna"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Básico" },
            })
          }
        />
        <Alert
          header="Huracan 3"
          description="Soluciones avanzadas para equipos y empresas."
          icon="antenna"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Empresarial" },
            })
          }
        />
        <Alert
          header="Huracan 4"
          description="Protege tus datos con cobertura avanzada."
          icon="antenna"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Con Seguro" },
            })
          }
        />
        <Alert
          header="Huracan 5"
          description="Soluciones avanzadas para instituciones públicas."
          icon="antenna"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan De Gobierno" },
            })
          }
        />
      </View>
    </View>
  );
}
