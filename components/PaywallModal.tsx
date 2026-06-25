import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors, Spacing, Typography, Radii, Shadows } from '@/theme';
import { useScanStore } from '@/stores/scan';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$20',
    period: '/month',
    sub: 'Billed monthly',
    popular: false,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$210',
    period: '/year',
    sub: 'Save $30 vs monthly',
    popular: true,
  },
] as const;

const PERKS = [
  { icon: 'infinite-outline', text: 'Unlimited daily scans' },
  { icon: 'flash-outline', text: 'Priority AI processing' },
  { icon: 'storefront-outline', text: 'Live seller prices & locations' },
  { icon: 'bookmark-outline', text: 'Unlimited saved products' },
  { icon: 'bar-chart-outline', text: 'Full product specs & history' },
];

export default function PaywallModal() {
  const { showPaywall, dismissPaywall, dailyScansUsed, dailyScansLimit } = useScanStore();
  const [selected, setSelected] = React.useState<'monthly' | 'yearly'>('yearly');

  if (!showPaywall) return null;

  const handleSubscribe = () => {
    // TODO: hook up to your payment provider (Stripe, RevenueCat, etc.)
    // For now open a placeholder URL or show alert
    dismissPaywall();
    Linking.openURL('https://scanit.app/upgrade').catch(() => {});
  };

  return (
    <Modal
      visible={showPaywall}
      transparent
      animationType="slide"
      onRequestClose={dismissPaywall}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismissPaywall} activeOpacity={1} />

        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={dismissPaywall}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="scan-outline" size={32} color={Colors.white} />
            </View>
            <Text style={styles.title}>You've used all{'\n'}free scans today</Text>
            <Text style={styles.subtitle}>
              {dailyScansUsed}/{dailyScansLimit} free scans used · Resets in 24 hrs
            </Text>
          </View>

          {/* Perks */}
          <View style={styles.perks}>
            {PERKS.map(p => (
              <View key={p.icon} style={styles.perkRow}>
                <View style={styles.perkIcon}>
                  <Ionicons name={p.icon as any} size={16} color={Colors.primary} />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <View style={styles.plans}>
            {PLANS.map(plan => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, selected === plan.id && styles.planCardSelected]}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.85}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
                  </View>
                )}
                <Text style={[styles.planLabel, selected === plan.id && styles.planLabelSelected]}>
                  {plan.label}
                </Text>
                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, selected === plan.id && styles.planPriceSelected]}>
                    {plan.price}
                  </Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
                <Text style={styles.planSub}>{plan.sub}</Text>
                <View style={[styles.radio, selected === plan.id && styles.radioSelected]}>
                  {selected === plan.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity style={styles.cta} onPress={handleSubscribe} activeOpacity={0.88}>
            <Text style={styles.ctaText}>
              Start Pro — {selected === 'monthly' ? '$20/mo' : '$210/yr'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>

          <Text style={styles.legalText}>
            Cancel anytime · Secure payment · Auto-renews
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    paddingBottom: 36,
    ...Shadows.lg,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.sm,
    zIndex: 10,
  },

  // Header
  header: { alignItems: 'center', paddingTop: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  // Perks
  perks: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  perkIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  perkText: { fontSize: Typography.sizes.sm, color: Colors.text, fontWeight: Typography.weights.medium },

  // Plans
  plans: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  planCard: {
    flex: 1,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  popularBadge: {
    position: 'absolute',
    top: 0, right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderBottomLeftRadius: Radii.sm,
  },
  popularText: { fontSize: 9, fontWeight: Typography.weights.bold, color: Colors.white, letterSpacing: 0.5 },
  planLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  planLabelSelected: { color: Colors.primary },
  planPriceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  planPrice: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.extrabold, color: Colors.text },
  planPriceSelected: { color: Colors.primary },
  planPeriod: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, paddingBottom: 3 },
  planSub: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.primary },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.pill,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    ...Shadows.md,
  },
  ctaText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },

  legalText: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
