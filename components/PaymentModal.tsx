/**
 * components/PaymentModal.tsx
 *
 * Payment modal for Paystack integration
 * Shows subscription plans and handles payment flow
 */

import { paymentService, PAYSTACK_PLANS } from "@/services/payment";
import { useAuthStore } from "@/stores/auth";
import { Colors, Radii, Spacing, Typography } from "@/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePaystack } from "react-native-paystack-webview";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planId?: string;
}

export default function PaymentModal({
  visible,
  onClose,
  onSuccess,
  planId,
}: PaymentModalProps) {
  const { user } = useAuthStore();
  const { popup } = usePaystack();
  const [selectedPlan, setSelectedPlan] = useState<string>(
    planId || PAYSTACK_PLANS[0].id,
  );
  const [processing, setProcessing] = useState(false);
  const [justPaid, setJustPaid] = useState(false);

  const selectedPlanData =
    PAYSTACK_PLANS.find((p) => p.id === selectedPlan) || PAYSTACK_PLANS[0];

  /**
   * Opens Paystack's checkout as an in-app modal (WebView-backed, never leaves ScanIt
   * or opens a browser). The client "success" callback only means the card was charged —
   * the backend re-verifies the transaction with Paystack's secret key before we
   * actually activate the subscription, so a tampered client can't grant itself premium.
   */

  const handleSubscribe = () => {
    if (!user?.email) {
      Alert.alert("Error", "Please sign in to subscribe");
      return;
    }

    const reference = paymentService.generatePaymentReference();

    popup.checkout({
      email: user.email,
      amount: selectedPlanData.amount, // main currency unit (GHS) — library converts to pesewas
      reference,
      metadata: { planId: selectedPlan, userId: user.id },
      onSuccess: async () => {
        setProcessing(true);
        try {
          const verifyRes = await paymentService.verifyPayment(
            reference,
            selectedPlan,
          );
          if (verifyRes.success && verifyRes.data?.isActive) {
            setJustPaid(true);
            setTimeout(() => {
              setJustPaid(false);
              onSuccess?.();
              onClose();
            }, 1600);
          } else {
            Alert.alert(
              "Payment Received",
              verifyRes.message ??
                "We charged your card but could not confirm the subscription yet. Contact support with reference " +
                  reference,
            );
          }
        } catch (e: any) {
          Alert.alert(
            "Verification Failed",
            e.message ??
              "Could not confirm payment. Contact support with reference " +
                reference,
          );
        } finally {
          setProcessing(false);
        }
      },
      onCancel: () => {
        // user closed the Paystack sheet — nothing to do
      },
      onError: (err) => {
        Alert.alert("Payment Error", err?.message ?? "Something went wrong");
      },
    });
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
              <Ionicons
                name="diamond-outline"
                size={48}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.heroTitle}>Unlock Unlimited Scans</Text>
            <Text style={styles.heroSubtitle}>
              Get the most out of ScanIt with premium features and unlimited
              product scans
            </Text>
          </Animated.View>

          {/* Features List */}
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={styles.features}
          >
            {[
              "Unlimited product scans",
              "Priority AI processing",
              "Advanced authenticity detection",
              "Price history tracking",
              "No advertisements",
              "Exclusive seller insights",
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={Colors.success}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Plans */}
          <Animated.View
            entering={FadeInDown.delay(300)}
            style={styles.plansSection}
          >
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
                    <Text style={styles.interval}>
                      /{plan.interval === "monthly" ? "mo" : "yr"}
                    </Text>
                  </View>
                </View>

                {plan.interval === "yearly" && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Save 17%</Text>
                  </View>
                )}

                <View style={styles.planFeatures}>
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <View key={i} style={styles.planFeatureItem}>
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={Colors.primary}
                      />
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
              style={[
                styles.subscribeBtn,
                processing && styles.subscribeBtnDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={processing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Colors.gradientPrimary as any}
                style={styles.subscribeBtnGradient}
              >
                {processing ? (
                  <Text style={styles.subscribeBtnText}>
                    Confirming payment…
                  </Text>
                ) : (
                  <>
                    <Text style={styles.subscribeBtnText}>
                      Subscribe for GHS {selectedPlanData.amount}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color={Colors.white}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.securedRow}>
              <Ionicons
                name="lock-closed"
                size={12}
                color={Colors.textSecondary}
              />
              <Text style={styles.disclaimer}>
                Pay right here in the app · Secured by Paystack · Cancel anytime
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Success overlay — shown briefly once the backend confirms the subscription */}
        {justPaid && (
          <Animated.View entering={FadeInDown} style={styles.successOverlay}>
            <Animated.View
              entering={ZoomIn.springify()}
              style={styles.successCard}
            >
              <LinearGradient
                colors={Colors.gradientPrimary as any}
                style={styles.successIcon}
              >
                <Ionicons name="checkmark" size={40} color={Colors.white} />
              </LinearGradient>
              <Text style={styles.successTitle}>You&apos;re Premium!</Text>
              <Text style={styles.successSubtitle}>
                Unlimited scans unlocked. Enjoy ScanIt.
              </Text>
            </Animated.View>
          </Animated.View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  features: {
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
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
    position: "relative",
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  planName: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
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
    position: "absolute",
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  planFeatureText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  cta: {
    alignItems: "center",
    gap: Spacing.md,
  },
  subscribeBtn: {
    width: "100%",
    borderRadius: Radii.xl,
    overflow: "hidden",
    minHeight: 56,
  },
  subscribeBtnDisabled: {
    opacity: 0.6,
  },
  subscribeBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  securedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  successCard: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.sm,
    width: "100%",
    maxWidth: 320,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.text,
  },
  successSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
