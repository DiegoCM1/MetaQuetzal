import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";

export default function PaymentScreen() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("Tarjeta");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");

  // Función para manejar el pago
  const handlePayment = () => {
    if (paymentMethod === "Tarjeta") {
      if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
        Alert.alert("Error", "Por favor, llena todos los campos.");
        return;
      }

      if (cardNumber.length !== 16 || isNaN(cardNumber)) {
        Alert.alert("Error", "El número de tarjeta debe tener 16 dígitos.");
        return;
      }

      if (cvv.length !== 3 || isNaN(cvv)) {
        Alert.alert("Error", "El CVV debe tener 3 dígitos.");
        return;
      }

      Alert.alert("Pago Exitoso", "Tu pago con tarjeta ha sido procesado.", [
        { text: "OK", onPress: () => router.push(`/confirmation?method=Tarjeta&plan=Seleccionado`) },
      ]);
    } else if (paymentMethod === "PayPal") {
      // Redirigir al enlace de PayPal
      router.push("https://www.paypal.com/checkoutnow");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Método de Pago</Text>

      <TouchableOpacity style={styles.option} onPress={() => setPaymentMethod("Tarjeta")}>
        <View style={styles.cardIcons}>
          <Image
            source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" }}
            style={styles.logo}
          />
          <Image
            source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg" }}
            style={styles.logo}
          />
        </View>
        <Text style={[styles.optionText, paymentMethod === "Tarjeta" && styles.selectedText]}>
          Pago con Tarjeta
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={() => setPaymentMethod("PayPal")}>
        <Image
          source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png" }}
          style={styles.logo}
        />
        <Text style={[styles.optionText, paymentMethod === "PayPal" && styles.selectedText]}>
          Pago con PayPal
        </Text>
      </TouchableOpacity>

      {paymentMethod === "Tarjeta" && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Número de Tarjeta"
            keyboardType="numeric"
            maxLength={16}
            value={cardNumber}
            onChangeText={setCardNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre del Titular"
            value={cardHolder}
            onChangeText={setCardHolder}
          />
          <TextInput
            style={styles.input}
            placeholder="Fecha de Expiración (MM/AA)"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
          <TextInput
            style={styles.input}
            placeholder="CVV"
            keyboardType="numeric"
            maxLength={3}
            value={cvv}
            onChangeText={setCvv}
          />
        </View>
      )}

      <TouchableOpacity style={styles.paymentButton} onPress={handlePayment}>
        <Text style={styles.paymentButtonText}>Confirmar Pago</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    width: "90%",
    justifyContent: "space-between",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
  },
  selectedText: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  logo: {
    width: 40,
    height: 24,
    resizeMode: "contain",
    marginHorizontal: 5,
  },
  cardIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  form: {
    width: "90%",
    marginTop: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#DDD",
  },
  paymentButton: {
    backgroundColor: "#4A90E2",
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 20,
    width: "90%",
  },
  paymentButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
