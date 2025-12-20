import { View, Text, TouchableOpacity } from 'react-native';
import { Plan, BillingPeriod } from '../_types';
import BillingToggle from './BillingToggle';
import FeatureList from './FeatureList';

interface PlanCardProps {
  plan: Plan;
  billingPeriod: BillingPeriod;
  onBillingChange: (period: BillingPeriod) => void;
  onSubscribe: () => void;
}

export default function PlanCard({
  plan,
  billingPeriod,
  onBillingChange,
  onSubscribe,
}: PlanCardProps) {
  const featureTitle = plan.id === 'basic' ? 'Incluye:' : 'Todo en Básico, más:';

  return (
    <View className="bg-phase2Cards dark:bg-phase2CardsDark rounded-2xl p-6 mb-4">
      {/* Plan name and description */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-phase2Titles dark:text-phase2TitlesDark mb-1">
          {plan.name}
        </Text>
        <Text className="text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark text-base">
          {plan.description}
        </Text>
      </View>

      {/* Billing period selector */}
      <BillingToggle
        plan={plan}
        billingPeriod={billingPeriod}
        onBillingChange={onBillingChange}
      />

      {/* CTA Button */}
      <TouchableOpacity
        onPress={onSubscribe}
        className="bg-phase2Buttons dark:bg-phase2ButtonsDark rounded-xl py-4 mb-6"
        activeOpacity={0.8}
      >
        <Text className="text-white dark:text-phase2TitlesDark text-center text-lg font-bold">
          Obtener {plan.name}
        </Text>
      </TouchableOpacity>

      {/* Features list */}
      <FeatureList features={plan.features} title={featureTitle} />

      {/* Terms note for premium */}
      {plan.id === 'premium' && (
        <Text className="text-phase2SecondaryTxt dark:text-phase2SecondaryTxtDark text-xs mt-4 opacity-70">
          Límites aplican según términos de servicio
        </Text>
      )}
    </View>
  );
}
