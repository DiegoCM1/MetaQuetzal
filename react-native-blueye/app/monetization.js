import "../global.css";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router"; // Importar el sistema de navegación

const CardPlan1 = ({ header, description, price, icon, onSelect }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Ionicons name={icon} size={32} color="#4A90E2" />
      <Text style={styles.cardTitle}>{header}</Text>
    </View>
    <Text style={styles.cardDescription}>{description}</Text>
    <Text style={styles.cardPrice}>{price}</Text>
    <TouchableOpacity style={styles.button} onPress={onSelect}>
      <Text style={styles.buttonText}>Seleccionar</Text>
    </TouchableOpacity>
  </View>
);

export default function SubscriptionScreen() {
  const router = useRouter(); // Hook para manejar la navegación

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Elige el plan ideal para ti</Text>
      <View style={styles.cardsContainer}>
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
            router.push({ pathname: "/payment", params: { plan: "Plan Básico" } })
          }
        />
        <CardPlan1
          header="Plan Empresarial"
          description="Soluciones avanzadas para equipos y empresas."
          price="$29.99/mes"
          icon="briefcase"
          onSelect={() =>
            router.push({ pathname: "/payment", params: { plan: "Plan Empresarial" } })
          }
        />
        <CardPlan1
          header="Plan Con Seguro"
          description="Protege tus datos con cobertura avanzada."
          price="$19.99/mes"
          icon="shield-checkmark"
          onSelect={() =>
            router.push({ pathname: "/payment", params: { plan: "Plan Con Seguro" } })
          }
        />
        <CardPlan1
          header="Plan De Gobierno"
          description="Soluciones avanzadas para instituciones públicas."
          price="$39.99/mes"
          icon="business"
          onSelect={() =>
            router.push({ pathname: "/payment", params: { plan: "Plan De Gobierno" } })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginVertical: 20,
  },
  cardsContainer: {
    flex: 1,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    marginVertical: 10,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A90E2",
    marginLeft: 10,
  },
  cardDescription: {
    fontSize: 16,
    color: "#555",
    marginVertical: 5,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
