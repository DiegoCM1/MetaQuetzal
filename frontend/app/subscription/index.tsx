import '../../global.css';
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { track } from '../../utils/analytics';
import PlanCard from './_components/PlanCard';
import { getPlans } from './_services/subscriptionService';
import { Plan, BillingPeriod } from './_types';
import ScreenHeader from "../../components/ScreenHeader"
import { colors, fonts } from "../../utils/theme"

export default function SubscriptionScreen() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriods, setBillingPeriods] = useState<Record<string, BillingPeriod>>({
    basic: 'monthly',
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
    setBillingPeriods((prev) => ({ ...prev, [planId]: period }));
    track('subscription_billing_toggle', { planId, period });
  };

  const handleSubscribe = (planId: string) => {
    track('subscription_cta_tap', { planId, billingPeriod: billingPeriods[planId] });
    Alert.alert('¡Próximamente!', 'Esta función estará disponible muy pronto.');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-transparent items-center justify-center">
        <ActivityIndicator size="large" color={colors.brandCyan} />
      </SafeAreaView>
    );
  }

  const basicPlan = plans.find(p => p.id === 'basic');

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Suscripción" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero image — swap source when final asset is ready */}
        <View className="px-4 pt-4">
          <Image
            source={require('../../assets/images/image.png')}
            style={{ width: '100%', height: 180, borderRadius: 16 }}
            resizeMode="cover"
          />
        </View>

        {/* Hero text */}
        <View className="px-6 pt-6 pb-4 items-center gap-4">
          <Text style={{ fontFamily: fonts.square721, color: 'white', fontSize: 38, lineHeight: 44, textAlign: 'center' }}>
            {'Protege\na tu familia'}
          </Text>
          <View className="px-5 py-2 rounded-full" style={{ backgroundColor: colors.brandBlue }}>
            <Text style={{ fontFamily: fonts.poppins, color: 'white', fontSize: 14 }}>
              Elige el plan ideal para ti
            </Text>
          </View>
        </View>

        {/* Basic plan only */}
        <View className="px-4 pb-8">
          {basicPlan && (
            <PlanCard
              plan={basicPlan}
              billingPeriod={billingPeriods[basicPlan.id] || 'monthly'}
              onBillingChange={(period) => handleBillingChange(basicPlan.id, period)}
              onSubscribe={() => handleSubscribe(basicPlan.id)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
