import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Plan, BillingPeriod } from '../_types';
import { colors, fonts } from '../../../utils/theme';

interface Props {
  visible: boolean;
  plan: Plan | null;
  billingPeriod: BillingPeriod;
  loading: boolean;
  onSelect: (provider: 'stripe' | 'mercadopago') => void;
  onClose: () => void;
}

const METHODS = [
  {
    id: 'stripe' as const,
    name: 'Stripe',
    description: 'Tarjeta de crédito o débito',
    icon: 'credit-card-outline' as const,
    color: '#635BFF',
  },
  {
    id: 'mercadopago' as const,
    name: 'MercadoPago',
    description: 'Efectivo, tarjeta o saldo MP',
    icon: 'wallet-outline' as const,
    color: '#00B1EA',
  },
];

export default function PaymentMethodSheet({ visible, plan, billingPeriod, loading, onSelect, onClose }: Props) {
  if (!plan) return null;

  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const periodLabel = billingPeriod === 'monthly' ? '/mes' : '/año';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>Elige cómo pagar</Text>
          <Text style={styles.subtitle}>
            {plan.name} · <Text style={{ color: colors.brandCyan }}>${price?.toFixed(2)}{periodLabel}</Text>
          </Text>

          <View style={styles.methods}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => !loading && onSelect(m.id)}
                activeOpacity={0.7}
                style={[styles.methodCard, { borderColor: `${m.color}55`, backgroundColor: `${m.color}12` }]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${m.color}22` }]}>
                  <MaterialCommunityIcons name={m.icon} size={24} color={m.color} />
                </View>

                <View style={styles.methodText}>
                  <Text style={styles.methodName}>{m.name}</Text>
                  <Text style={styles.methodDesc}>{m.description}</Text>
                </View>

                <MaterialCommunityIcons
                  name={loading ? 'dots-horizontal' : 'chevron-right'}
                  size={20}
                  color="rgba(255,255,255,0.25)"
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#070e1c',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.square721,
    color: 'white',
    fontSize: 22,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.poppins,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 28,
  },
  methods: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  methodText: {
    flex: 1,
  },
  methodName: {
    fontFamily: fonts.poppinsSemiBold,
    color: 'white',
    fontSize: 16,
  },
  methodDesc: {
    fontFamily: fonts.poppins,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 20,
    marginBottom: 8,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: fonts.poppins,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 14,
  },
});
