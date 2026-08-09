import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Plan, BillingPeriod } from '../_types';
import BillingToggle from './BillingToggle';
import FeatureList from './FeatureList';
import { fonts } from '../../../utils/theme';

const PLAN_ACCENT: Record<string, { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  free:  { color: '#2ecaff', icon: 'shield-outline' },
  safe:  { color: '#3167ff', icon: 'shield-home-outline' },
  guard: { color: '#9200ff', icon: 'shield-star-outline' },
  edu:   { color: '#00e774', icon: 'school-outline' },
};

const IS_DEV = process.env.EXPO_PUBLIC_DEV_BYPASS_AUTH === 'true';

interface PlanCardProps {
  plan: Plan;
  billingPeriod: BillingPeriod;
  isCurrentPlan: boolean;
  onBillingChange: (period: BillingPeriod) => void;
  onSubscribe: () => void;
  onSimulate?: () => void;
}

export default function PlanCard({ plan, billingPeriod, isCurrentPlan, onBillingChange, onSubscribe, onSimulate }: PlanCardProps) {
  const accent = PLAN_ACCENT[plan.slug] ?? PLAN_ACCENT.free;
  const canSubscribe = !plan.isFree && !isCurrentPlan;

  const ctaLabel = isCurrentPlan ? 'Plan actual' : plan.isFree ? 'Plan gratuito' : `Obtener ${plan.name}`;

  return (
    <View style={[
      styles.card,
      { borderColor: isCurrentPlan ? accent.color : `${accent.color}40` },
      isCurrentPlan && { borderWidth: 2, backgroundColor: `${accent.color}0d` },
    ]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: `${accent.color}20` }]}>
          <MaterialCommunityIcons name={accent.icon} size={22} color={accent.color} />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.planName, { color: accent.color }]}>{plan.name}</Text>
          <Text style={styles.planDesc}>{plan.description}</Text>
        </View>

        {isCurrentPlan && (
          <View style={[styles.badge, { backgroundColor: `${accent.color}25`, borderColor: `${accent.color}60` }]}>
            <Text style={[styles.badgeText, { color: accent.color }]}>Activo</Text>
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: `${accent.color}20` }]} />

      {/* Features */}
      <FeatureList features={plan.features} title="INCLUYE:" />

      {/* Billing toggle for paid plans */}
      {!plan.isFree && (
        <View style={{ marginTop: 16 }}>
          <BillingToggle plan={plan} billingPeriod={billingPeriod} onBillingChange={onBillingChange} />
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity
        onPress={canSubscribe ? onSubscribe : undefined}
        activeOpacity={canSubscribe ? 0.8 : 1}
        style={[
          styles.cta,
          canSubscribe
            ? { backgroundColor: accent.color }
            : { backgroundColor: `${accent.color}15`, borderWidth: 1, borderColor: `${accent.color}30` },
        ]}
      >
        <Text style={[styles.ctaText, { color: canSubscribe ? 'white' : `${accent.color}80` }]}>
          {ctaLabel}
        </Text>
      </TouchableOpacity>

      {/* Dev-only simulate button */}
      {IS_DEV && onSimulate && !isCurrentPlan && (
        <TouchableOpacity onPress={onSimulate} activeOpacity={0.7} style={styles.devBtn}>
          <MaterialCommunityIcons name="lightning-bolt" size={13} color="#ffce00" />
          <Text style={styles.devBtnText}>Simular activación (dev)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(8, 18, 36, 0.85)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 18,
    marginBottom: 2,
  },
  planDesc: {
    fontFamily: fonts.poppins,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 11,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  cta: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  ctaText: {
    fontFamily: fonts.poppinsSemiBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,206,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,206,0,0.25)',
  },
  devBtnText: {
    fontFamily: fonts.poppins,
    fontSize: 12,
    color: '#ffce00',
  },
});
