import '../../global.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ScrollView, ActivityIndicator, Alert, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { track } from '../../utils/analytics';
import PlanCard from './_components/PlanCard';
import PaymentMethodSheet from './_components/PaymentMethodSheet';
import { getPlans, getSubscription, createCheckoutSession, devSimulateSubscription } from './_services/subscriptionService';
import { Plan, BillingPeriod, Subscription } from './_types';
import ScreenHeader from '../../components/ScreenHeader';
import { colors } from '../../utils/theme';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [billingPeriods, setBillingPeriods] = useState<Record<string, BillingPeriod>>({});
  const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; period: BillingPeriod } | null>(null);

  useEffect(() => {
    track('subscription_main_view');
    load();
  }, []);

  const load = async () => {
    const [plansData, sub] = await Promise.all([
      getPlans(),
      getSubscription().catch(() => null),
    ]);
    setPlans(plansData);
    setSubscription(sub);

    const defaults: Record<string, BillingPeriod> = {};
    plansData.forEach((p) => { defaults[p.slug] = 'monthly'; });
    setBillingPeriods(defaults);
    setLoading(false);
  };

  const handleBillingChange = (slug: string, period: BillingPeriod) => {
    setBillingPeriods((prev) => ({ ...prev, [slug]: period }));
    track('subscription_billing_toggle', { slug, period });
  };

  const handleSubscribe = async (plan: Plan) => {
    const period = billingPeriods[plan.slug] ?? 'monthly';
    track('subscription_cta_tap', { slug: plan.slug, period });

    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert(
        'Inicia sesión',
        'Necesitas iniciar sesión para suscribirte.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => router.push('/(auth)') },
        ],
      );
      return;
    }

    setPendingPlan({ plan, period });
  };

  const handleSimulate = async (plan: Plan) => {
    const period = billingPeriods[plan.slug] ?? 'monthly';
    try {
      const sub = await devSimulateSubscription(plan.slug, period);
      setSubscription(sub);
      Alert.alert('✅ Plan activado', `${plan.name} activo para pruebas.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al simular.';
      Alert.alert('Error', msg);
    }
  };

  const checkout = async (plan: Plan, period: BillingPeriod, provider: 'stripe' | 'mercadopago') => {
    setPendingPlan(null);
    track('subscription_provider_selected', { slug: plan.slug, period, provider });
    setCheckingOut(plan.slug);
    try {
      const url = await createCheckoutSession(plan.slug, period, provider);
      await Linking.openURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Inténtalo más tarde.';
      Alert.alert('Error al procesar pago', msg);
    } finally {
      setCheckingOut(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-transparent items-center justify-center">
        <ActivityIndicator size="large" color={colors.brandCyan} />
      </SafeAreaView>
    );
  }

  const currentSlug = subscription?.planSlug ?? 'free';

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Suscripción" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-4">
          <Image
            source={require('../../assets/images/SUSCRIPTION-FAMILY.webp')}
            style={{ width: '100%', height: 180, borderRadius: 16 }}
            resizeMode="cover"
          />
        </View>

        <View className="px-6 pt-6 pb-4 items-center gap-4">
          <Text
            style={{
              fontFamily: 'Square721',
              color: 'white',
              fontSize: 34,
              lineHeight: 40,
              textAlign: 'center',
            }}
          >
            {'Protege\na tu familia'}
          </Text>
        </View>

        <View className="px-4 pb-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.slug}
              plan={plan}
              billingPeriod={billingPeriods[plan.slug] ?? 'monthly'}
              isCurrentPlan={plan.slug === currentSlug}
              onBillingChange={(p) => handleBillingChange(plan.slug, p)}
              onSubscribe={
                checkingOut === plan.slug
                  ? () => {}
                  : () => handleSubscribe(plan)
              }
              onSimulate={plan.isFree ? undefined : () => handleSimulate(plan)}
            />
          ))}
        </View>
      </ScrollView>

      <PaymentMethodSheet
        visible={pendingPlan !== null}
        plan={pendingPlan?.plan ?? null}
        billingPeriod={pendingPlan?.period ?? 'monthly'}
        loading={checkingOut !== null}
        onSelect={(provider) => {
          if (pendingPlan) checkout(pendingPlan.plan, pendingPlan.period, provider);
        }}
        onClose={() => setPendingPlan(null)}
      />
    </SafeAreaView>
  );
}
