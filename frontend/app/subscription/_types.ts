// Subscription types

export type BillingPeriod = 'monthly' | 'annual';

export interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number; // percentage saved on annual
  features: string[];
  popular?: boolean;
  recommended?: boolean;
}

export interface Subscription {
  userId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  status: 'active' | 'inactive' | 'cancelled';
  startDate: string;
  endDate: string;
}
