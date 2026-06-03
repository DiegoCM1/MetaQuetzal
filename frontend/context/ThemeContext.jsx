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
    // v1: single light theme — brand palette is always active
    setColorScheme("light");
  };

  // v2: uncomment to restore dark mode toggle
  // const toggleColorScheme = async () => {
  //   const newTheme = colorScheme === "dark" ? "light" : "dark";
  //   try {
  //     await AsyncStorage.setItem(THEME_KEY, newTheme);
  //     setColorScheme(newTheme);
  //   } catch (error) {
  //     console.error("Error saving theme:", error);
  //   }
  // };
  const toggleColorScheme = () => {};

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useTheme = () => useContext(ThemeContext);
