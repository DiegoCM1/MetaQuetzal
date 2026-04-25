import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plan, BillingPeriod } from '../_types';
import BillingToggle from './BillingToggle';
import FeatureList from './FeatureList';
import { colors, fonts } from '../../../utils/theme';

interface PlanCardProps {
  plan: Plan;
  billingPeriod: BillingPeriod;
  onBillingChange: (period: BillingPeriod) => void;
  onSubscribe: () => void;
}

export default function PlanCard({ plan, billingPeriod, onBillingChange, onSubscribe }: PlanCardProps) {
  return (
    <View style={styles.card}>
      {/* Plan name */}
      <Text style={{ fontFamily: fonts.poppinsSemiBold, color: 'white', fontSize: 22, marginBottom: 16 }}>
        {plan.name}
      </Text>

      {/* Features */}
      <FeatureList features={plan.features} title="INCLUYE:" />

      {/* Billing toggle */}
      <View style={{ marginTop: 16 }}>
        <BillingToggle plan={plan} billingPeriod={billingPeriod} onBillingChange={onBillingChange} />
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onSubscribe}
        activeOpacity={0.8}
        style={[styles.cta, { backgroundColor: colors.brandBlue }]}
      >
        <Text style={{ fontFamily: fonts.poppinsSemiBold, color: 'white', fontSize: 15, letterSpacing: 1 }}>
          OBTENER {plan.name.toUpperCase()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(10, 28, 50, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    marginBottom: 16,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
});
