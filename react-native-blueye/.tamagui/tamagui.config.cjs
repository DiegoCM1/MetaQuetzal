var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// tamagui.config.js
var tamagui_config_exports = {};
__export(tamagui_config_exports, {
  default: () => tamagui_config_default
});
module.exports = __toCommonJS(tamagui_config_exports);
var import_core = require("@tamagui/core");
var config = (0, import_core.createTamagui)({
  themes: {
    light: {
      background: "#fff",
      color: "#000"
    },
    dark: {
      background: "#000",
      color: "#fff"
    }
  },
  tokens: {
    size: {
      4: 16,
      // Espaciado base (1rem equivalente)
      6: 24,
      8: 32,
      10: 40
    },
    color: {
      color1: "#ffffff",
      // Fondo blanco
      color3: "#007bff",
      // Azul para botones u otros elementos
      color11: "#666666",
      // Gris para texto secundario
      color12: "#000000",
      // Texto principal
      background: "#f5f5f5",
      // Fondo general
      shadowColor: "#000000",
      // Sombra negra
      borderColor: "#007bff",
      // Agregado para bordes
      backgroundHover: "#0056b3",
      // Azul más oscuro al pasar el mouse
      borderColorHover: "#000000",
      backgroundPress: "#003d80",
      // Azul aún más oscuro al presionar
      borderColorPress: "#003d80",
      colorHover: "#ffffff"
      // Texto blanco para contraste
    },
    radius: {
      4: 8
      // 8px de radio
    }
  },
  shorthands: {
    padding: "padding",
    margin: "margin"
  }
});
var tamagui_config_default = config;
