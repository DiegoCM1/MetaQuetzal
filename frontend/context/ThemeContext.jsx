import React, { createContext, useContext } from "react";
import { useColorScheme } from "nativewind";

// Crea el contexto
const ThemeContext = createContext();

// Proveedor del tema
export const ThemeProvider = ({ children }) => {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useTheme = () => useContext(ThemeContext);
