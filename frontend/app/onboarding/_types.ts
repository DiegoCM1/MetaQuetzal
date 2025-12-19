/**
 * Onboarding TypeScript Types
 * Defines interfaces for user data collection during first-time setup
 */

export interface OnboardingData {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    zipCode: string;
    city: string;
    nervousnessLevel: number; // 1-10
    age: string; // Age range
    weatherInfoLevel: number; // 1-10
  }
  
  export interface OnboardingContextValue {
    data: OnboardingData;
    updateField: (field: keyof OnboardingData, value: string | number) => void;
    updateMultipleFields: (updates: Partial<OnboardingData>) => void;
    submitOnboarding: () => Promise<void>;
    resetOnboarding: () => void;
  }
  
  export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
  }
  
  export const AGE_RANGES = [
    '18-25',
    '26-35',
    '36-45',
    '46-55',
    '56-65',
    '66+',
  ] as const;
  
  export type AgeRange = typeof AGE_RANGES[number];