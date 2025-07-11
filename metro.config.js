const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { withTamagui } = require("@tamagui/metro-plugin");

const config = getDefaultConfig(__dirname);

module.exports = withTamagui(
  withNativeWind(config, { input: "./global.css" }), // Configuración de NativeWind
  {
    config: "./tamagui.config.js", // Ruta a tu archivo de configuración Tamagui
    components: ["@tamagui/core"], // Componentes Tamagui a incluir
    logTimings: true, // Opcional: para depuración
  }
);
