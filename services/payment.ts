/**
 * services/payment.ts
 *
<<<<<<< HEAD
 * Paystack payment integration for ScanIt subscriptions.
=======
 * Paystack payment integration for ScanIt.
 *
 * SECURITY: the Paystack *secret* key must never live in this file or in any
 * EXPO_PUBLIC_ env var — anything with that prefix gets bundled straight into
 * the APK and can be extracted by anyone. Verifying a transaction and
 * activating a subscription happens on the backend (services/../backend/.../PaymentService.java),
 * which holds the secret key as a server-only env var. This file only ever
 * touches the Paystack *public* key, which is safe to ship in the app.
>>>>>>> 8312fe05e7644889110700cc8d1c208e0456e4b7
 */

import type { ApiResponse } from "@/types";
import { api } from "@/utils/api";

<<<<<<< HEAD
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

export interface InitializePaymentParams {
  plan: 'monthly' | 'yearly';
  amount?: number; // in GHS, defaults to 20 (monthly) or 210 (yearly)
}

export interface InitializePaymentResponse {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  publicKey: string;
}

export async function initializePayment(
  params: InitializePaymentParams,
): Promise<InitializePaymentResponse> {
  const amount = params.amount ?? (params.plan === 'yearly' ? 210 : 20);
  const data = await api.post<PaymentInitResponse>('/payments/initialize', null, {
    query: { plan: params.plan, amount: String(amount) },
  });
  return {
    reference: data.reference,
    authorizationUrl: data.authorizationUrl,
    accessCode: data.accessCode,
    publicKey: data.publicKey,
  };
}

export async function verifyPayment(reference: string): Promise<PaymentVerifyResponse> {
  const data = await api.get<PaymentVerifyResponse>('/payments/verify', {
    query: { reference },
  });
  return data;
}

export function getPaystackPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY;
}

export function isPaystackConfigured(): boolean {
  return PAYSTACK_PUBLIC_KEY.length > 0;
}
=======
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";

export interface VerifyPaymentResponse {
  isActive: boolean;
  plan?: string;
  expiresAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number; // in GHS
  interval: "monthly" | "yearly";
  features: string[];
  scanLimit: number;
}

/** Must stay in sync with PaymentService.PLANS on the backend (amount in GHS there is pesewas / 100). */
export const PAYSTACK_PLANS: SubscriptionPlan[] = [
  {
    id: "premium_monthly",
    name: "Premium Monthly",
    amount: 15, // GHS 15 per month
    interval: "monthly",
    features: ["25 scans", "Priority AI processing"],
    scanLimit: 25,
  },
  {
    id: "premium_yearly",
    name: "Premium Yearly",
    amount: 150, // GHS 150 per year (save 17%)
    interval: "yearly",
    features: [
      "80 scans",
      "Priority AI processing",
      "Advanced authenticity detection",
      "Price history tracking",
      "No ads",
      "Exclusive seller insights",
      "Early access to new features",
    ],
    scanLimit: -1, // unlimited
  },
];

export const paymentService = {
  /** Public key for the in-app Paystack checkout — safe to expose. */
  getPublicKey(): string {
    return PAYSTACK_PUBLIC_KEY;
  },

  /**
   * Generate a unique payment reference for this transaction attempt.
   */
  generatePaymentReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `SCANIT_${timestamp}_${random}`.toUpperCase();
  },

  /**
   * After the in-app Paystack checkout reports success, the backend re-verifies
   * the transaction with Paystack directly (using the secret key) before
   * activating the subscription — the client's "success" callback is never trusted alone.
   */
  async verifyPayment(
    reference: string,
    planId: string,
  ): Promise<ApiResponse<VerifyPaymentResponse>> {
    try {
      const data = await api.post<VerifyPaymentResponse>("/payments/verify", {
        reference,
        planId,
      });
      return { success: true, data };
    } catch (e: any) {
      return {
        success: false,
        message: e.message ?? "Failed to verify payment",
        data: null as never,
      };
    }
  },

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return { success: true, data: PAYSTACK_PLANS };
  },

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<
    ApiResponse<{
      isActive: boolean;
      plan?: SubscriptionPlan;
      endDate?: string;
    }>
  > {
    try {
      const data = await api.get<{
        isActive: boolean;
        plan?: string;
        expiresAt?: string;
      }>("/payments/subscription");
      const plan = PAYSTACK_PLANS.find((p) => p.id === data.plan);
      return {
        success: true,
        data: { isActive: data.isActive, plan, endDate: data.expiresAt },
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message ?? "Failed to fetch subscription status",
        data: null as never,
      };
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<ApiResponse<null>> {
    try {
      await api.post("/payments/cancel-subscription");
      return { success: true, data: null };
    } catch (e: any) {
      return {
        success: false,
        message: e.message ?? "Failed to cancel subscription",
        data: null,
      };
    }
  },
};
>>>>>>> 8312fe05e7644889110700cc8d1c208e0456e4b7
