import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DaltonicModeContext = createContext();

export const DaltonicModeProvider = ({ children }) => {
  const [isDaltonicMode, setIsDaltonicMode] = useState(false);

  // Leer el estado inicial del almacenamiento
  useEffect(() => {
    const loadMode = async () => {
      const storedMode = await AsyncStorage.getItem("daltonicMode");
      if (storedMode !== null) {
        setIsDaltonicMode(JSON.parse(storedMode)); // Convertir a booleano
      }
    };
    loadMode();
  }, []);

  // Guardar cambios en el almacenamiento
  const toggleDaltonicMode = async () => {
    const newMode = !isDaltonicMode;
    setIsDaltonicMode(newMode);
    await AsyncStorage.setItem("daltonicMode", JSON.stringify(newMode)); // Guardar como string
  };

  return (
    <DaltonicModeContext.Provider value={{ isDaltonicMode, toggleDaltonicMode }}>
      {children}
    </DaltonicModeContext.Provider>
  );
};

export const useDaltonicMode = () => useContext(DaltonicModeContext);
