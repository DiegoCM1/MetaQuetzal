import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import type { OnboardingData, OnboardingContextValue } from '../_types';
import { saveOnboardingData } from '../_services/onboardingService';
import { track } from '../../../utils/analytics';

const initialData: OnboardingData = {
  firstName: '',
  lastName: '',
  address1: '',
  address2: '',
  zipCode: '',
  state: '',
  nervousnessLevel: 5,
  age: '',
  weatherInfoLevel: 5,
};

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>(initialData);
  const router = useRouter();

  const updateField = (field: keyof OnboardingData, value: string | number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateMultipleFields = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const submitOnboarding = async () => {
    try {
      await saveOnboardingData(data);
      track('onboarding_completed', {
        nervousness_level: data.nervousnessLevel,
        age_range: data.age,
        weather_info_level: data.weatherInfoLevel,
      });
      router.replace('/(tabs)/MapScreen');
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      throw error;
    }
  };

  const resetOnboarding = () => {
    setData(initialData);
  };

  return (
    <OnboardingContext.Provider
      value={{
        data,
        updateField,
        updateMultipleFields,
        submitOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};