import type { OnboardingData, ValidationResult } from './_types';

/**
 * Validates Step 1 fields (Personal Information)
 */
export const validateStep1 = (data: Partial<OnboardingData>): ValidationResult => {
  const errors: Record<string, string> = {};

  // First name validation
  if (!data.firstName || data.firstName.trim().length === 0) {
    errors.firstName = 'El nombre es requerido';
  } else if (data.firstName.trim().length < 2) {
    errors.firstName = 'El nombre debe tener al menos 2 caracteres';
  }

  // Last name validation
  if (!data.lastName || data.lastName.trim().length === 0) {
    errors.lastName = 'El apellido es requerido';
  } else if (data.lastName.trim().length < 2) {
    errors.lastName = 'El apellido debe tener al menos 2 caracteres';
  }

  // Address validation
  if (!data.address1 || data.address1.trim().length === 0) {
    errors.address1 = 'La dirección es requerida';
  } else if (data.address1.trim().length < 5) {
    errors.address1 = 'La dirección debe tener al menos 5 caracteres';
  }

  // ZIP code validation
  if (!data.zipCode || data.zipCode.trim().length === 0) {
    errors.zipCode = 'El código postal es requerido';
  } else if (!/^\d{5}$/.test(data.zipCode)) {
    errors.zipCode = 'Debe ser un código postal de 5 dígitos';
  }

  // City validation
  if (!data.city || data.city.trim().length === 0) {
    errors.city = 'La ciudad es requerida';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates Step 2 fields (Preferences)
 */
export const validateStep2 = (data: Partial<OnboardingData>): ValidationResult => {
  const errors: Record<string, string> = {};

  // Nervousness level validation
  if (data.nervousnessLevel === undefined || data.nervousnessLevel < 1 || data.nervousnessLevel > 10) {
    errors.nervousnessLevel = 'Selecciona un nivel entre 1 y 10';
  }

  // Age validation
  if (!data.age || data.age.trim().length === 0) {
    errors.age = 'Selecciona tu rango de edad';
  }

  // Weather info level validation
  if (data.weatherInfoLevel === undefined || data.weatherInfoLevel < 1 || data.weatherInfoLevel > 10) {
    errors.weatherInfoLevel = 'Selecciona un nivel entre 1 y 10';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};