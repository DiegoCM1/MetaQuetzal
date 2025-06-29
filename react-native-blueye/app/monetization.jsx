import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const CardPlan1 = ({ header, description, price, icon, onSelect }) => (
  <View className="bg-phase2Cards dark:bg-phase2CardsDark rounded-xl p-6 my-4 w-11/12 shadow-lg">
    <View className="flex-row items-center mb-4">
      <Ionicons
        name={icon}
        size={32}
        color="rgb(50, 180, 200)" // phase2Buttons
      />
      <Text className="text-xl font-bold text-phase2Titles dark:text-phase2TitlesDark ml-4">
        {header}
      </Text>
    </View>
    <Text className="text-base text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark my-2">
      {description}
    </Text>
    <Text className="text-lg font-bold text-phase2Titles dark:text-phase2TitlesDark my-3">
      {price}
    </Text>
    <TouchableOpacity
      className="bg-phase2Buttons dark:bg-phase2ButtonsDark rounded-lg py-3 items-center mt-4"
      onPress={onSelect}
    >
      <Text className="text-phase2SmallTxt dark:text-phase2TitlesDark font-bold text-base">
        Seleccionar
      </Text>
    </TouchableOpacity>
  </View>
);

export default function SubscriptionScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 px-5">
      <StatusBar style="light" />
      <Text className="text-2xl font-bold text-phase2Titles dark:text-phase2TitlesDark text-center my-5">
        Elige el plan ideal para ti
      </Text>
      <View className="flex-1 items-center">
        <CardPlan1
          header="Plan Pro"
          description="Accede a todas las funciones premium con soporte dedicado y más."
          price="$9.99/mes"
          icon="star"
          onSelect={() =>
            router.push({ pathname: "/payment", params: { plan: "Plan Pro" } })
          }
        />
        <CardPlan1
          header="Plan Básico"
          description="Disfruta de funciones esenciales para empezar."
          price="$4.99/mes"
          icon="leaf"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Básico" },
            })
          }
        />
        <CardPlan1
          header="Plan Empresarial"
          description="Soluciones avanzadas para equipos y empresas."
          price="$29.99/mes"
          icon="briefcase"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Empresarial" },
            })
          }
        />
        <CardPlan1
          header="Plan Con Seguro"
          description="Protege tus datos con cobertura avanzada."
          price="$19.99/mes"
          icon="shield-checkmark"
          onSelect={() =>
            router.push({
              pathname: "/payment",
              params: { plan: "Plan Con Seguro" },
            })
          }
        />
        <CardPlan1
          header="Plan De Gobierno"
          description="Soluciones avanzadas para instituciones públicas."
          price="$39.99/mes"
          icon="business"
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
