import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

type CartItem = { id: string; qty: number };

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
    // Let SDK use its bundled apiVersion to avoid TS literal mismatches
    this.stripe = new Stripe(key);
  }

  private async computeAmountCents(items: CartItem[]): Promise<number> {
    const unit = 10000; // placeholder: 100.00
    const qty = items.reduce((s, i) => s + (i.qty || 0), 0);
    return unit * qty || 100;
  }

  async createPaymentIntent(items: CartItem[], currency = 'ils') {
    const amount = await this.computeAmountCents(items);
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });
  }

  async retrievePaymentIntent(id: string) {
    return this.stripe.paymentIntents.retrieve(id);
  }
}
