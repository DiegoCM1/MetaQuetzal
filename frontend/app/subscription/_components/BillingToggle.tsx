import { View, Text, TouchableOpacity } from 'react-native';
import { BillingPeriod, Plan } from '../_types';

interface BillingToggleProps {
  plan: Plan;
  billingPeriod: BillingPeriod;
  onBillingChange: (period: BillingPeriod) => void;
}

export default function BillingToggle({
  plan,
  billingPeriod,
  onBillingChange,
}: BillingToggleProps) {
  return (
    <View className="flex-row mb-4">
      {/* Monthly option */}
      <TouchableOpacity
        onPress={() => onBillingChange('monthly')}
        className={`flex-1 mr-2 p-4 rounded-xl border-2 ${
          billingPeriod === 'monthly'
            ? 'border-phase2Buttons bg-phase2Buttons/10'
            : 'border-phase2SecondaryTxt/30 bg-transparent'
        }`}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center mb-2">
          <View
            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
              billingPeriod === 'monthly'
                ? 'border-phase2Buttons bg-phase2Buttons'
                : 'border-phase2SecondaryTxt bg-transparent'
            }`}
          >
            {billingPeriod === 'monthly' && (
              <View className="w-2 h-2 rounded-full bg-white" />
            )}
          </View>
        </View>
        <Text className="text-phase2Titles text-xl font-bold">
          ${plan.monthlyPrice.toFixed(2)}
        </Text>
        <Text className="text-phase2SecondaryTxt text-sm">Facturación mensual</Text>
      </TouchableOpacity>

      {/* Annual option */}
      <TouchableOpacity
        onPress={() => onBillingChange('annual')}
        className={`flex-1 ml-2 p-4 rounded-xl border-2 ${
          billingPeriod === 'annual'
            ? 'border-phase2Buttons bg-phase2Buttons/10'
            : 'border-phase2SecondaryTxt/30 bg-transparent'
        }`}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View
            className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
              billingPeriod === 'annual'
                ? 'border-phase2Buttons bg-phase2Buttons'
                : 'border-phase2SecondaryTxt bg-transparent'
            }`}
          >
            {billingPeriod === 'annual' && (
              <View className="w-2 h-2 rounded-full bg-white" />
            )}
          </View>
          <View className="bg-phase2Buttons/20 px-2 py-1 rounded">
            <Text className="text-phase2Buttons text-xs font-semibold">
              Ahorra {plan.annualDiscount}%
            </Text>
          </View>
        </View>
        <Text className="text-phase2Titles text-xl font-bold">
          ${plan.annualPrice.toFixed(2)}
        </Text>
        <Text className="text-phase2SecondaryTxt text-sm">Facturación anual</Text>
      </TouchableOpacity>
    </View>
  );
}
