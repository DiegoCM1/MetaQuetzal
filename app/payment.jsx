import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/Ionicons";
import { useDaltonicMode } from "../context/DaltonicModeContext"; // Importar el contexto

export default function PaymentScreen() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState("Tarjeta");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  
  // Obtener el estado del modo daltonismo
  const { isDaltonicMode } = useDaltonicMode();

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
        {
          text: "OK",
          onPress: () =>
            router.push(`/confirmation?method=Tarjeta&plan=Seleccionado`),
        },
      ]);
    } else if (paymentMethod === "PayPal") {
      router.push("https://www.paypal.com/checkoutnow");
    }
  };

  return (
    <View
      className={`flex-1 p-5 items-center ${
        isDaltonicMode ? "bg-phase2bgDaltonic" : "bg-phase2bg"
      }`}
    >
      <Text
        className={`text-2xl font-bold mb-5 ${
          isDaltonicMode ? "text-phase2TitlesDaltonic" : "text-phase2Titles"
        }`}
      >
        Método de Pago
      </Text>

      {/* Opción de Tarjeta */}
      <TouchableOpacity
        className={`flex-row items-center p-4 mb-3 border ${
          paymentMethod === "Tarjeta"
            ? isDaltonicMode
              ? "border-phase2ButtonsDaltonic"
              : "border-phase2Buttons"
            : isDaltonicMode
            ? "border-phase2BordersDaltonic"
            : "border-phase2Borders"
        } rounded-lg w-11/12 justify-between ${
          isDaltonicMode ? "bg-phase2CardsDaltonic" : "bg-white"
        }`}
        onPress={() => setPaymentMethod("Tarjeta")}
      >
        <View className="flex-row items-center">
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png",
            }}
            className="w-10 h-6 mr-2"
            resizeMode="contain"
          />
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/b/b7/MasterCard_Logo.svg",
            }}
            className="w-10 h-6"
            resizeMode="contain"
          />
        </View>
        <Text
          className={`text-base ${
            paymentMethod === "Tarjeta"
              ? isDaltonicMode
                ? "text-phase2ButtonsDaltonic font-bold"
                : "text-phase2Buttons font-bold"
              : isDaltonicMode
              ? "text-phase2TitlesDaltonic"
              : "text-phase2Titles"
          }`}
        >
          Pago con Tarjeta
        </Text>
      </TouchableOpacity>

      {/* Opción de PayPal */}
      <TouchableOpacity
        className={`flex-row items-center p-4 mb-3 border ${
          paymentMethod === "PayPal"
            ? isDaltonicMode
              ? "border-phase2ButtonsDaltonic"
              : "border-phase2Buttons"
            : isDaltonicMode
            ? "border-phase2BordersDaltonic"
            : "border-phase2Borders"
        } rounded-lg w-11/12 justify-between ${
          isDaltonicMode ? "bg-phase2CardsDaltonic" : "bg-white"
        }`}
        onPress={() => setPaymentMethod("PayPal")}
      >
        <Image
          source={{
            uri: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png",
          }}
          className="w-10 h-6"
          resizeMode="contain"
        />
        <Text
          className={`text-base ${
            paymentMethod === "PayPal"
              ? isDaltonicMode
                ? "text-phase2ButtonsDaltonic font-bold"
                : "text-phase2Buttons font-bold"
              : isDaltonicMode
              ? "text-phase2TitlesDaltonic"
              : "text-phase2Titles"
          }`}
        >
          Pago con PayPal
        </Text>
      </TouchableOpacity>

      {/* Información de tarjeta si está seleccionada */}
      {paymentMethod === "Tarjeta" && (
        <View className="w-11/12 mt-5">
          <TextInput
            className={`w-full p-4 rounded-lg mb-4 text-base border ${
              isDaltonicMode
                ? "bg-phase2CardsDaltonic border-phase2BordersDaltonic text-phase2SmallTxtDaltonic"
                : "bg-phase2Cards border-phase2Borders text-phase2SmallTxt"
            }`}
            placeholder="Número de Tarjeta"
            placeholderTextColor="rgb(120,120,120)"
            keyboardType="numeric"
            maxLength={16}
            value={cardNumber}
            onChangeText={setCardNumber}
          />
          <TextInput
            className={`w-full p-4 rounded-lg mb-4 text-base border ${
              isDaltonicMode
                ? "bg-phase2CardsDaltonic border-phase2BordersDaltonic text-phase2SmallTxtDaltonic"
                : "bg-phase2Cards border-phase2Borders text-phase2SmallTxt"
            }`}
            placeholder="Nombre del Titular"
            placeholderTextColor="rgb(120,120,120)"
            value={cardHolder}
            onChangeText={setCardHolder}
          />
          <TextInput
            className={`w-full p-4 rounded-lg mb-4 text-base border ${
              isDaltonicMode
                ? "bg-phase2CardsDaltonic border-phase2BordersDaltonic text-phase2SmallTxtDaltonic"
                : "bg-phase2Cards border-phase2Borders text-phase2SmallTxt"
            }`}
            placeholder="Fecha de Expiración (MM/AA)"
            placeholderTextColor="rgb(120,120,120)"
            value={expiryDate}
            onChangeText={setExpiryDate}
          />
          <TextInput
            className={`w-full p-4 rounded-lg mb-4 text-base border ${
              isDaltonicMode
                ? "bg-phase2CardsDaltonic border-phase2BordersDaltonic text-phase2SmallTxtDaltonic"
                : "bg-phase2Cards border-phase2Borders text-phase2SmallTxt"
            }`}
            placeholder="CVV"
            placeholderTextColor="rgb(120,120,120)"
            keyboardType="numeric"
            maxLength={3}
            value={cvv}
            onChangeText={setCvv}
          />
        </View>
      )}

      {/* Botón de Confirmar */}
      <TouchableOpacity
        className={`rounded-lg py-4 px-6 items-center mt-5 w-11/12 shadow-md ${
          isDaltonicMode ? "bg-phase2ButtonsDaltonic" : "bg-phase2Buttons"
        }`}
        onPress={handlePayment}
      >
        <Text
          className={`font-bold text-base ${
            isDaltonicMode
              ? "text-phase2SmallTxtDaltonic"
              : "text-phase2SmallTxt"
          }`}
        >
          Confirmar Pago
        </Text>
      </TouchableOpacity>
    </View>
  );
}
