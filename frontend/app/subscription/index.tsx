import '../../global.css';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '../../utils/analytics';
import PlanCard from './_components/PlanCard';
import { getPlans } from './_services/subscriptionService';
import { Plan, BillingPeriod } from './_types';

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  // State independiente por cada plan
  const [billingPeriods, setBillingPeriods] = useState<Record<string, BillingPeriod>>({
    basic: 'monthly',
    premium: 'monthly',
  });

  useEffect(() => {
    track('subscription_main_view');
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const plansData = await getPlans();
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBillingChange = (planId: string, period: BillingPeriod) => {
    setBillingPeriods((prev) => ({
      ...prev,
      [planId]: period,
    }));
    track('subscription_billing_toggle', { planId, period });
  };

  const handleSubscribe = (planId: string) => {
    const billingPeriod = billingPeriods[planId];
    track('subscription_cta_tap', {
      planId,
      billingPeriod,
    });

    // TODO: Implement actual subscription flow
    Alert.alert(
      'Próximamente',
      `Función de pago en desarrollo. Plan seleccionado: ${planId} (${billingPeriod})`,
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-900 items-center justify-center">
        <ActivityIndicator size="large" color="rgb(50, 180, 200)" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white dark:bg-neutral-900"
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="px-6 py-8 items-center">
          <Text className="text-4xl font-bold text-phase2Titles dark:text-phase2TitlesDark mb-2">
            Protege a tu familia
          </Text>
          <Text className="text-lg text-center text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark">
            Elige el plan ideal para ti
          </Text>
        </View>

        {/* Plan Cards */}
        <View className="px-4 pb-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billingPeriod={billingPeriods[plan.id] || 'monthly'}
              onBillingChange={(period) => handleBillingChange(plan.id, period)}
              onSubscribe={() => handleSubscribe(plan.id)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
