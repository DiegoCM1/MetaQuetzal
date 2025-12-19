import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData } from '../_types';

const ONBOARDING_KEY = '@blueye_onboarding';
const ONBOARDING_COMPLETED_KEY = '@blueye_onboarding_completed';

/**
 * Checks if user has completed onboarding
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

/**
 * Saves onboarding data to AsyncStorage
 */
export const saveOnboardingData = async (data: OnboardingData): Promise<void> => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
};

/**
 * Retrieves saved onboarding data
 */
export const getOnboardingData = async (): Promise<OnboardingData | null> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting onboarding data:', error);
    return null;
  }
};

/**
 * Clears onboarding data (useful for testing)
 */
export const clearOnboardingData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
    throw error;
  }
};