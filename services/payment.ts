/**
 * services/payment.ts
 *
<<<<<<< HEAD
 * Paystack payment integration for ScanIt subscriptions.
 */

import { api } from '@/utils/api';
import type { PaymentInitResponse, PaymentVerifyResponse } from '@/types';

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
 * Paystack payment integration for ScanIt
 * Supports one-time payments and subscription management
 */

import type { ApiResponse } from '@/types';
import { api } from '@/utils/api';

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_live_74e29f7885f02e0c92e44b0e981dd26fea044376';
const PAYSTACK_SECRET_KEY = process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY || 'sk_live_3a4c203545a2e21f973b67f86eea4b3a5062e74a';

export interface PaymentRequest {
  email: string;
  amount: number; // in GHS (smallest currency unit: pesewas)
  reference?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  reference: string;
  accessCode: string;
  authorizationUrl: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
}

export interface VerifyPaymentResponse {
  status: 'success' | 'failed' | 'pending';
  amount: number;
  reference: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number; // in GHS
  interval: 'monthly' | 'yearly';
  features: string[];
  scanLimit: number;
}

export const PAYSTACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium_monthly',
    name: 'Premium Monthly',
    amount: 15, // GHS 15 per month
    interval: 'monthly',
    features: [
      'Unlimited scans',
      'Priority AI processing',
      'Advanced authenticity detection',
      'Price history tracking',
      'No ads'
    ],
    scanLimit: -1 // unlimited
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    amount: 150, // GHS 150 per year (save 17%)
    interval: 'yearly',
    features: [
      'Unlimited scans',
      'Priority AI processing',
      'Advanced authenticity detection',
      'Price history tracking',
      'No ads',
      'Exclusive seller insights',
      'Early access to new features'
    ],
    scanLimit: -1 // unlimited
  }
];

export const paymentService = {
  /**
   * Generate a unique payment reference
   */
  generatePaymentReference(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `SCANIT_${timestamp}_${random}`.toUpperCase();
  },

  /**
   * Initialize a payment transaction with Paystack
   * Returns authorization URL and access code for the payment modal
   */
  async initializePayment(request: PaymentRequest): Promise<ApiResponse<PaymentResponse>> {
    try {
      // Direct Paystack API call
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: request.email,
          amount: request.amount,
          reference: request.reference,
          metadata: request.metadata,
        }),
      });

      const result = await response.json();
      
      if (result.status) {
        return { 
          success: true, 
          data: {
            reference: result.data.reference,
            accessCode: result.data.access_code,
            authorizationUrl: result.data.authorization_url,
            amount: result.data.amount,
            status: result.data.status as 'success' | 'pending' | 'failed',
          }
        };
      } else {
        return { success: false, message: result.message ?? 'Failed to initialize payment', data: null as never };
      }
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to initialize payment', data: null as never };
    }
  },

  /**
   * Verify a payment transaction using its reference
   */
  async verifyPayment(reference: string): Promise<ApiResponse<VerifyPaymentResponse>> {
    try {
      // Direct Paystack API call
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.status) {
        return { 
          success: true, 
          data: {
            status: result.data.status as 'success' | 'failed' | 'pending',
            amount: result.data.amount,
            reference: result.data.reference,
            metadata: result.data.metadata,
          }
        };
      } else {
        return { success: false, message: result.message ?? 'Failed to verify payment', data: null as never };
      }
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to verify payment', data: null as never };
    }
  },

  /**
   * Get available subscription plans
   */
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    try {
      // Return static plans for now - can be fetched from backend later
      return { success: true, data: PAYSTACK_PLANS };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to fetch plans', data: null as never };
    }
  },

  /**
   * Subscribe to a plan
   */
  async subscribeToPlan(planId: string): Promise<ApiResponse<PaymentResponse>> {
    try {
      const data = await api.post<PaymentResponse>('/payments/subscribe', { planId });
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to subscribe', data: null as never };
    }
  },

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<ApiResponse<{ isActive: boolean; plan?: SubscriptionPlan; endDate?: string }>> {
    try {
      const data = await api.get<{ isActive: boolean; plan?: SubscriptionPlan; endDate?: string }>('/payments/subscription');
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to fetch subscription status', data: null as never };
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<ApiResponse<null>> {
    try {
      await api.post('/payments/cancel-subscription');
      return { success: true, data: null };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to cancel subscription', data: null };
    }
  }
};
>>>>>>> fb320f6d1cce0224c30665283c3694f077a8abba
