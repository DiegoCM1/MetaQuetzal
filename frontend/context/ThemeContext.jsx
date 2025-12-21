import React, { createContext, useContext, useEffect } from "react";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "@blueye_theme";

// Crea el contexto
const ThemeContext = createContext();

// Proveedor del tema
export const ThemeProvider = ({ children }) => {
  const { colorScheme, setColorScheme } = useColorScheme();

  // Cargar tema guardado al iniciar
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        console.log("🎨 Loading saved theme:", savedTheme);
        setColorScheme(savedTheme);
      } else {
        // Default to light mode if no preference saved
        console.log("🎨 No saved theme, using default: light");
        setColorScheme("light");
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      // On error, default to light
      setColorScheme("light");
    }
  };

  const toggleColorScheme = async () => {
    const newTheme = colorScheme === "dark" ? "light" : "dark";
    console.log("🎨 Toggling theme to:", newTheme);

    try {
      // Guardar en AsyncStorage
      await AsyncStorage.setItem(THEME_KEY, newTheme);
      console.log("✅ Theme saved to AsyncStorage");

      // Aplicar el cambio
      setColorScheme(newTheme);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useTheme = () => useContext(ThemeContext);
