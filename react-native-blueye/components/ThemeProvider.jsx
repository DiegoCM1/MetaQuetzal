import React, { createContext, useState, useContext } from "react";

// Crear el contexto del tema
const ThemeContext = createContext();

// Proveedor del tema
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light"); // Tema inicial

  // Alternar tema
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook para usar el tema
export const useTheme = () => useContext(ThemeContext);
