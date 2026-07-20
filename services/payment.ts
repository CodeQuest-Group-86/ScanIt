/**
 * services/payment.ts
 *
 * Paystack payment integration for ScanIt
 * Supports one-time payments and subscription management
 */

import type { ApiResponse } from '@/types';
import { api } from '@/utils/api';

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
      const data = await api.post<PaymentResponse>('/payments/initialize', request, { skipAuth: false });
      return { success: true, data };
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Failed to initialize payment', data: null as never };
    }
  },

  /**
   * Verify a payment transaction using its reference
   */
  async verifyPayment(reference: string): Promise<ApiResponse<VerifyPaymentResponse>> {
    try {
      const data = await api.get<VerifyPaymentResponse>(`/payments/verify/${reference}`);
      return { success: true, data };
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
