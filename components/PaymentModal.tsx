/**
 * components/PaymentModal.tsx
 *
 * Payment modal for Paystack integration
 * Shows subscription plans and handles payment flow
 */

import { paymentService, PAYSTACK_PLANS } from '@/services/payment';
import { useAuthStore } from '@/stores/auth';
import { Colors, Radii, Spacing, Typography } from '@/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planId?: string;
}

export default function PaymentModal({ visible, onClose, onSuccess, planId }: PaymentModalProps) {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string>(planId || PAYSTACK_PLANS[0].id);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const selectedPlanData = PAYSTACK_PLANS.find(p => p.id === selectedPlan) || PAYSTACK_PLANS[0];

  const handleSubscribe = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'Please sign in to subscribe');
      return;
    }

    setLoading(true);
    try {
      const reference = paymentService.generatePaymentReference();
      const amountInPesewas = selectedPlanData.amount * 100; // Convert to pesewas

      const res = await paymentService.initializePayment({
        email: user.email,
        amount: amountInPesewas,
        reference,
        metadata: {
          planId: selectedPlan,
          userId: user.id,
        },
      });

      if (res.success && res.data) {
        // Open Paystack payment URL in browser
        setProcessing(true);
        const result = await WebBrowser.openBrowserAsync(res.data.authorizationUrl);
        
        if (result.type === 'cancel') {
          Alert.alert('Payment Cancelled', 'You cancelled the payment process');
        } else if (result.type === 'dismiss') {
          // Verify payment status
          const verifyRes = await paymentService.verifyPayment(reference);
          if (verifyRes.success && verifyRes.data?.status === 'success') {
            Alert.alert('Payment Successful', 'Your subscription is now active!');
            onSuccess?.();
            onClose();
          } else {
            Alert.alert('Payment Pending', 'Your payment is being processed');
          }
        }
        setProcessing(false);
      } else {
        Alert.alert('Payment Error', res.message ?? 'Failed to initialize payment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.surface, Colors.white]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.hero}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Unlock Unlimited Scans</Text>
            <Text style={styles.heroSubtitle}>
              Get the most out of ScanIt with premium features and unlimited product scans
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.features}>
            {[
              'Unlimited product scans',
              'Priority AI processing',
              'Advanced authenticity detection',
              'Price history tracking',
              'No advertisements',
              'Exclusive seller insights',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Plans */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.plansSection}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            
            {PAYSTACK_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.currency}>GHS</Text>
                    <Text style={styles.price}>{plan.amount}</Text>
                    <Text style={styles.interval}>/{plan.interval === 'monthly' ? 'mo' : 'yr'}</Text>
                  </View>
                </View>
                
                {plan.interval === 'yearly' && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Save 17%</Text>
                  </View>
                )}

                <View style={styles.planFeatures}>
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <View key={i} style={styles.planFeatureItem}>
                      <Ionicons name="checkmark" size={16} color={Colors.primary} />
                      <Text style={styles.planFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* CTA Button */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.cta}>
            <TouchableOpacity
              style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
              onPress={handleSubscribe}
              disabled={loading || processing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Colors.gradientPrimary as any}
                style={styles.subscribeBtnGradient}
              >
                {loading || processing ? (
                  <Text style={styles.subscribeBtnText}>Processing...</Text>
                ) : (
                  <>
                    <Text style={styles.subscribeBtnText}>
                      Subscribe for GHS {selectedPlanData.amount}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Secure payment powered by Paystack. Cancel anytime.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  features: {
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  plansSection: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
    marginRight: 2,
  },
  price: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.primary,
  },
  interval: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: Spacing.lg,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  planFeatures: {
    gap: Spacing.sm,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  planFeatureText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  cta: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  subscribeBtn: {
    width: '100%',
    borderRadius: Radii.xl,
    overflow: 'hidden',
    minHeight: 56,
  },
  subscribeBtnDisabled: {
    opacity: 0.6,
  },
  subscribeBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    minHeight: 56,
  },
  subscribeBtnText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  disclaimer: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
