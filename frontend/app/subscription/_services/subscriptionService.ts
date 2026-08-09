import { Plan, Subscription } from '../_types';
import { API_BASE_URL } from '../../../utils/config';
import { authFetch } from '../../../utils/api';

const FALLBACK_PLANS: Plan[] = [
  {
    slug: 'free',
    name: 'Bluai',
    description: 'Protección básica para ti',
    monthlyPrice: null,
    annualPrice: null,
    annualDiscount: 0,
    features: ['IA Empática Offline', 'Mapa de Riesgos y Apoyo', 'Alertas SIAT-CT Oficiales'],
    isFree: true,
  },
  {
    slug: 'safe',
    name: 'Bluai Safe',
    description: 'Para familias que quieren estar siempre conectadas',
    monthlyPrice: 4.99,
    annualPrice: 49.90,
    annualDiscount: 17,
    features: ['Todo el plan Gratuito', 'Geolocalización de Familiares', 'Botón de Pánico'],
    isFree: false,
  },
  {
    slug: 'guard',
    name: 'Blu Guard',
    description: 'Gestión de equipos y personal crítico',
    monthlyPrice: 9.99,
    annualPrice: 99.90,
    annualDiscount: 17,
    features: [
      'Todo el plan Safe',
      'Gestión de Personal Crítico',
      'Dashboard Predictivo Centralizado',
      'Comunicación Ininterrumpida',
    ],
    isFree: false,
  },
  {
    slug: 'edu',
    name: 'Blu Edu',
    description: 'Para instituciones educativas',
    monthlyPrice: null,
    annualPrice: null,
    annualDiscount: 0,
    features: ['Todo el plan Gratuito', 'Geolocalización', 'Botón de Pánico', 'Módulos de Resiliencia'],
    isFree: true,
  },
];

function mapPlan(raw: Record<string, unknown>): Plan {
  return {
    slug: String(raw.slug),
    name: String(raw.name),
    description: String(raw.description ?? ''),
    monthlyPrice: raw.monthly_price != null ? Number(raw.monthly_price) : null,
    annualPrice: raw.annual_price != null ? Number(raw.annual_price) : null,
    annualDiscount: Number(raw.annual_discount ?? 0),
    features: Array.isArray(raw.features) ? raw.features.map(String) : [],
    isFree: Boolean(raw.is_free),
  };
}

export async function getPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/payments/plans`);
    if (!res.ok) return FALLBACK_PLANS;
    const data = await res.json();
    if (!Array.isArray(data)) return FALLBACK_PLANS;
    return data.map(mapPlan);
  } catch {
    return FALLBACK_PLANS;
  }
}

export async function getSubscription(): Promise<Subscription> {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/v1/payments/subscription`);
    if (!res.ok) return { planSlug: 'free', status: 'active', currentPeriodEnd: null };
    const data = await res.json();
    return {
      planSlug: String(data.plan_slug ?? 'free'),
      status: data.status ?? 'active',
      currentPeriodEnd: data.current_period_end ?? null,
    };
  } catch {
    return { planSlug: 'free', status: 'active', currentPeriodEnd: null };
  }
}

export async function getFamilyMembers() {
  return [] as import('../_types').FamilyMember[];
}

export async function devSimulateSubscription(
  planSlug: string,
  billingPeriod: 'monthly' | 'annual' = 'monthly',
): Promise<Subscription> {
  const res = await authFetch(`${API_BASE_URL}/api/v1/payments/dev/simulate`, {
    method: 'POST',
    body: JSON.stringify({ plan_slug: planSlug, billing_period: billingPeriod }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Error ${res.status}`);
  }
  const data = await res.json();
  return {
    planSlug: String(data.plan_slug ?? planSlug),
    status: 'active',
    currentPeriodEnd: data.current_period_end ?? null,
  };
}

export async function createCheckoutSession(
  planSlug: string,
  billingPeriod: 'monthly' | 'annual',
  provider: 'stripe' | 'mercadopago' | 'auto' = 'auto',
): Promise<string> {
  const res = await authFetch(`${API_BASE_URL}/api/v1/payments/checkout`, {
    method: 'POST',
    body: JSON.stringify({ plan_slug: planSlug, billing_period: billingPeriod, provider }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Error ${res.status}`);
  }
  const data = await res.json();
  return String(data.checkout_url);
}
