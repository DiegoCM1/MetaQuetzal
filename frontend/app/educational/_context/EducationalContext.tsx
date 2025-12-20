// Educational content context for managing favorites and history

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EducationalContextType {
  favorites: string[];
  history: string[];
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addToHistory: (id: string) => void;
  clearHistory: () => void;
}

const EducationalContext = createContext<EducationalContextType | undefined>(undefined);

const FAVORITES_KEY = '@blueeye_educational_favorites';
const HISTORY_KEY = '@blueeye_educational_history';

export function EducationalProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites and history on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favoritesData, historyData] = await Promise.all([
        AsyncStorage.getItem(FAVORITES_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
      ]);

      if (favoritesData) {
        setFavorites(JSON.parse(favoritesData));
      }
      if (historyData) {
        setHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Error loading educational data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const addFavorite = async (id: string) => {
    try {
      const updated = [...favorites, id];
      setFavorites(updated);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving favorite:', error);
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const updated = favorites.filter((fav) => fav !== id);
      setFavorites(updated);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const isFavorite = (id: string): boolean => {
    return favorites.includes(id);
  };

  const addToHistory = async (id: string) => {
    try {
      // Remove if already exists to move it to front
      const filtered = history.filter((item) => item !== id);
      const updated = [id, ...filtered].slice(0, 20); // Keep last 20
      setHistory(updated);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  if (!isLoaded) {
    return null; // or a loading spinner
  }

  return (
    <EducationalContext.Provider
      value={{
        favorites,
        history,
        addFavorite,
        removeFavorite,
        isFavorite,
        addToHistory,
        clearHistory,
      }}
    >
      {children}
    </EducationalContext.Provider>
  );
}

export function useEducational() {
  const context = useContext(EducationalContext);
  if (!context) {
    throw new Error('useEducational must be used within EducationalProvider');
  }
  return context;
}
