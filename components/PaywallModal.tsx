import { useScanStore } from '@/stores/scan';
import { Colors, Radii, Shadows, Spacing, Typography } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import PaymentModal from './PaymentModal';

const PERKS = [
  { icon: 'infinite-outline', text: 'Way more scans — 25/month or unlimited on yearly' },
  { icon: 'flash-outline', text: 'Priority AI processing' },
  { icon: 'storefront-outline', text: 'Live seller prices & locations' },
  { icon: 'bookmark-outline', text: 'Unlimited saved products' },
  { icon: 'bar-chart-outline', text: 'Full product specs & history' },
];

export default function PaywallModal() {
  const { showPaywall, dismissPaywall, totalScansUsed, dailyScansLimit, setPremium } = useScanStore();
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);

  if (!showPaywall) return null;

  const handleSubscribe = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setPremium(true);
    setShowPaymentModal(false);
    dismissPaywall();
  };

  return (
    <>
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
              <Text style={styles.title}>{'You'}{'\u2019'}ve used today{'’'}s{'\n'}free scans</Text>
              <Text style={styles.subtitle}>
                {totalScansUsed}/{dailyScansLimit} free scans used today · Upgrade for more
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

            {/* CTA */}
            <TouchableOpacity style={styles.cta} onPress={handleSubscribe} activeOpacity={0.88}>
              <Text style={styles.ctaText}>
                Upgrade to Premium
              </Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>

            <Text style={styles.legalText}>
              One-time payment · Secure payment powered by Paystack
            </Text>
          </View>
        </View>
      </Modal>

      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
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

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  ctaText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  legalText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});