import "../global.css";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import CardPlan1 from "../components/Card-Plan1";

export default function SubscriptionScreen() {
  const router = useRouter(); // Hook para la navegación

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Elige el plan ideal para ti</Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Componente Tamagui con datos personalizados */}
        {[
          {
            header: "Plan Pro",
            description: "Accede a todas las funciones premium con soporte dedicado y más.",
            price: "$9.99/mes",
          },
          {
            header: "Plan Básico",
            description: "Disfruta de funciones esenciales para empezar.",
            price: "$4.99/mes",
          },
          {
            header: "Plan Empresarial",
            description: "Soluciones avanzadas para equipos y empresas.",
            price: "$29.99/mes",
          },
          {
            header: "Plan Con Seguro",
            description: "Soluciones avanzadas para equipos y empresas.",
            price: "$29.99/mes",
          },
          {
            header: "Plan De Gobierno",
            description: "Soluciones avanzadas para equipos y empresas.",
            price: "$29.99/mes",
          },
        ].map((plan, index) => (
          <View key={index} style={styles.card}>
            <CardPlan1
              header={plan.header}
              description={plan.description}
              price={plan.price}
            />
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => router.push({ pathname: "/payment", query: { plan: plan.header } })} // Navegar a PaymentScreen con el plan seleccionado
            >
              <Text style={styles.selectButtonText}>Seleccionar Plan</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f7",
    alignItems: "center",
  },
  headerContainer: {
    width: "100%",
    paddingVertical: 30,
    backgroundColor: "#1f78d1",
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  cardsContainer: {
    width: "90%",
    marginTop: 30,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  selectButton: {
    marginTop: 15,
    backgroundColor: "#1f78d1",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  selectButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
});
