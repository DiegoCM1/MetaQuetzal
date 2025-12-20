// Subscription service with mock data

import { Plan } from '../_types';

export const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Plan Básico',
    description: 'Para familias pequeñas',
    monthlyPrice: 4.99,
    annualPrice: 49.99,
    annualDiscount: 17,
    features: [
      'Alertas para hasta 3 miembros',
      'Notificaciones en tiempo real',
      'Contenido educativo básico',
      'Soporte por email',
    ],
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    description: 'Para familias grandes y grupos',
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    annualDiscount: 17,
    popular: true,
    recommended: true,
    features: [
      'Alertas para hasta 10 miembros',
      'Ubicación en tiempo real de familia',
      'Notificaciones coordinadas',
      'Plan de emergencia familiar',
      'Contenido educativo premium',
      'Soporte prioritario 24/7',
      'Historial de alertas extendido',
    ],
  },
];

/**
 * Get all available plans
 */
export const getPlans = async (): Promise<Plan[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 200));
  return PLANS;
};

/**
 * Get a specific plan by ID
 */
export const getPlanById = async (id: string): Promise<Plan | null> => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return PLANS.find((plan) => plan.id === id) || null;
};

/**
 * Calculate savings for annual billing
 */
export const calculateAnnualSavings = (plan: Plan): number => {
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = monthlyTotal - plan.annualPrice;
  return Math.round(savings * 100) / 100;
};
