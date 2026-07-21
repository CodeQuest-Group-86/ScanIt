/**
 * services/payment.ts
 *
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
