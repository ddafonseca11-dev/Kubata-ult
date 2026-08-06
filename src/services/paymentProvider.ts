import type { Payment } from '@/types';

export interface PaymentProvider {
  name: string;
  createCheckout(params: {
    paymentId: string;
    amount: number;
    currency: string;
    description?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ checkoutUrl: string; externalId: string }>;
  getPaymentStatus(externalId: string): Promise<{ status: string; metadata?: Record<string, unknown> }>;
  handleWebhook(payload: unknown, signature?: string): Promise<{
    externalId: string;
    status: string;
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }>;
}

export const PaymentProviderName = {
  STRIPE: 'stripe',
  PAYPAL: 'paypal',
  NONE: 'none',
} as const;

export function getActiveProvider(): string {
  return import.meta.env.VITE_PAYMENT_PROVIDER || 'none';
}

export function isPaymentEnabled(): boolean {
  const provider = getActiveProvider();
  return provider !== 'none';
}

export function getPaymentPublicKey(): string {
  return import.meta.env.VITE_PAYMENT_PUBLIC_KEY || '';
}

export const PAYMENT_STATUS_MAP: Record<string, Payment['status']> = {
  succeeded: 'completed',
  paid: 'completed',
  completed: 'completed',
  pending: 'pending',
  processing: 'processing',
  failed: 'failed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  refunded: 'refunded',
};
