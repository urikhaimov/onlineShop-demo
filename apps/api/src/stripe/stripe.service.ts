import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

type CartItem = { id: string; qty: number; priceCents?: number };

function buildIdemKey(params: {
  provided?: string | undefined;
  amountCents: number;
  currency: string; // lower-case
  suffix?: string; // e.g., orderId or userId
}) {
  const fallback = `pi:${params.currency}:${params.amountCents}:${params.suffix ?? 'no-suffix'}`;
  const key = (params.provided || fallback).trim();
  return key.length > 255 ? key.slice(0, 255) : key;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
    // Pin apiVersion to keep types happy across packages
    this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
  }

  /** Sum items in *cents*. If an item has no priceCents, assume 100 (= ₪/$/€ 1.00) to avoid zero-amount PIs. */
  private computeAmountCents(items: CartItem[]): number {
    return items.reduce((sum, it) => {
      const qty = Math.max(0, Number(it.qty || 0));
      const price = Math.max(0, Number(it.priceCents ?? 100)); // default = 1.00
      return sum + price * qty;
    }, 0);
  }

  /**
   * Create a PaymentIntent from explicit *amount in major units* (e.g., 123.45).
   * Prefer this path when your controller already calculated totals.
   */
  async createPaymentIntentMajor(input: {
    amountMajor: number;
    currency?: string;
    idempotencyKey?: string;
    metadata?: Record<string, string>;
    email?: string;
    orderId?: string;
    userId?: string;
  }) {
    const currency = String(input.currency ?? 'ils').toLowerCase();
    const amountCents = Math.max(0, Math.round((input.amountMajor ?? 0) * 100));

    const idem = buildIdemKey({
      provided: input.idempotencyKey,
      amountCents,
      currency,
      suffix: input.orderId ?? input.userId,
    });

    return this.stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency,
        // Keep parity with your frontend config (PaymentElement set to card only)
        payment_method_types: ['card'],
        payment_method_options: {
          card: { request_three_d_secure: 'automatic' },
        },
        metadata: {
          ...(input.metadata ?? {}),
          ...(input.orderId ? { orderId: String(input.orderId) } : {}),
          ...(input.userId ? { userId: String(input.userId) } : {}),
          app: 'onlineShop',
        },
        receipt_email: input.email || undefined,
      },
      { idempotencyKey: idem },
    );
  }

  /**
   * Convenience: create a PaymentIntent by passing cart items with optional priceCents.
   * If you already have a computed total, prefer `createPaymentIntentMajor`.
   */
  async createPaymentIntentFromItems(input: {
    items: CartItem[];
    currency?: string;
    idempotencyKey?: string;
    metadata?: Record<string, string>;
    email?: string;
    orderId?: string;
    userId?: string;
  }) {
    const amountCents = this.computeAmountCents(input.items || []);
    return this.createPaymentIntentMajor({
      amountMajor: amountCents / 100,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      metadata: {
        ...(input.metadata ?? {}),
        // Persist a compact items list if you like; keep it small (<500 chars)
        items: JSON.stringify(
          (input.items || []).map((i) => ({
            id: String(i.id),
            qty: Number(i.qty || 0),
          })),
        ).slice(0, 450),
      },
      email: input.email,
      orderId: input.orderId,
      userId: input.userId,
    });
  }

  async retrievePaymentIntent(id: string) {
    return this.stripe.paymentIntents.retrieve(id);
  }
}
