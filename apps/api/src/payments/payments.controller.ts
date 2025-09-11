import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  Body,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';

type CreateIntentDto = {
  cartId: string;
  items: Array<{ id: string; qty: number }>;
  currency: string; // e.g. "ILS"
  customerEmail?: string;
};

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  public readonly stripe: Stripe; // public for tests to spy
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')!;
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
  }

  // ----------------------------------------------------------------------------
  // POST /payments/create-intent
  // ----------------------------------------------------------------------------
  @Post('create-intent')
  @HttpCode(201)
  async createPaymentIntent(@Body() dto: CreateIntentDto) {
    const cartId = String(dto.cartId ?? '');
    const currency = String(dto.currency ?? 'ILS').toLowerCase();

    // 1) Fetch prices for items
    let subtotal = 0;
    for (const it of dto.items ?? []) {
      const pid = String(it.id);
      const qty = Number(it.qty ?? 0);
      const snap = await adminDb.collection('products').doc(pid).get();
      const unit = Number(snap.get('price') ?? 0);
      subtotal += unit * qty;
    }

    // 2) Settings (shipping/tax/discount)
    // The tests stub three sequential gets: shipping, taxRate, discount
    const settingsSnap = await adminDb
      .collection('settings')
      .doc('payments')
      .get();
    const shipping = Number(settingsSnap.get('shipping') ?? 0);
    const taxRate = Number(settingsSnap.get('taxRate') ?? 0); // percent
    const discount = Number(settingsSnap.get('discount') ?? 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));

    const total = Math.max(0, subtotal + shipping + taxAmount - discount);
    const amount = Math.round(total * 100); // to smallest currency unit

    // 3) Stripe PaymentIntent with idempotency per-cart
    const intent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { cartId },
        receipt_email: dto.customerEmail || undefined,
      },
      { idempotencyKey: `pi_${cartId}` },
    );

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  // ----------------------------------------------------------------------------
  // POST /payments/webhooks/stripe
  // ----------------------------------------------------------------------------
  @Post('webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') sigLower?: string,
    @Headers('Stripe-Signature') sigTitle?: string,
  ) {
    const signature = sigLower ?? sigTitle ?? '';
    let event: Stripe.Event;

    try {
      const raw = (req as any).rawBody ?? (req.body as any);
      event = this.stripe.webhooks.constructEvent(
        raw,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    const handleSucceeded = async (pi: Stripe.PaymentIntent) => {
      const orderId = String(pi.metadata?.cartId ?? pi.id);
      await adminDb.runTransaction(async (tx) => {
        const ref = adminDb.collection('orders').doc(orderId);
        const snap = await tx.get(ref);
        if (snap.exists) {
          tx.update(ref, {
            status: 'paid',
            amount: pi.amount_received ?? pi.amount,
            currency: pi.currency,
            paymentIntentId: pi.id,
            updatedAt: new Date(),
          });
        } else {
          // ✅ create ONLY on success
          tx.set(ref, {
            status: 'paid',
            amount: pi.amount_received ?? pi.amount,
            currency: pi.currency,
            paymentIntentId: pi.id,
            cartId: pi.metadata?.cartId ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    };

    const handleNonSuccess = async (
      pi: Stripe.PaymentIntent,
      status: 'payment_failed' | 'canceled' | 'requires_payment_method',
    ) => {
      const orderId = String(pi.metadata?.cartId ?? pi.id);
      // ❌ never create on non-success; only update if exists
      await adminDb.runTransaction(async (tx) => {
        const ref = adminDb.collection('orders').doc(orderId);
        const snap = await tx.get(ref);
        if (snap.exists) {
          tx.update(ref, {
            status,
            lastError: pi.last_payment_error?.code ?? null,
            updatedAt: new Date(),
          });
        }
      });
    };

    switch (event.type as string) {
      case 'payment_intent.succeeded':
        await handleSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handleNonSuccess(
          event.data.object as Stripe.PaymentIntent,
          'payment_failed',
        );
        break;

      case 'payment_intent.canceled':
        await handleNonSuccess(
          event.data.object as Stripe.PaymentIntent,
          'canceled',
        );
        break;

      case 'payment_intent.requires_payment_method':
        await handleNonSuccess(
          event.data.object as Stripe.PaymentIntent,
          'requires_payment_method',
        );
        break;

      default:
        this.logger.log(`Unhandled event: ${event.type}`);
        break;
    }

    return { received: true };
  }
}
