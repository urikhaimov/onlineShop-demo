import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  Body,
  Inject,
  Optional,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';
// 👇 add FieldValue for atomic increments
import { FieldValue } from 'firebase-admin/firestore';

type CreateIntentDto = {
  cartId: string;
  items: Array<{ id: string; qty: number }>;
  currency: string; // e.g. "ILS"
  customerEmail?: string;
};

type MailerLike = {
  sendOrderConfirmation?: (
    to: string,
    payload: {
      orderId: string;
      amount: number;
      currency: string | null;
      paymentIntentId: string;
      created: boolean;
    },
  ) => Promise<any> | any;
  sendRefundEmail?: (
    to: string,
    payload: {
      orderId: string;
      amount: number;
      currency: string | null;
      chargeId: string;
      full: boolean;
      refundIds: string[];
    },
  ) => Promise<any> | any;
};

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  public readonly stripe: Stripe; // public for tests to spy
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject('MAIL_SERVICE') private readonly mailer?: MailerLike,
  ) {
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

    // 3) Compact items metadata for stock decrement on success
    const itemsMeta = JSON.stringify(
      (dto.items ?? []).map((i) => ({
        id: String(i.id),
        qty: Number(i.qty || 0),
      })),
    );
    // Stripe metadata values are limited (~500 chars). Keep a safe margin.
    const itemsMetaSafe =
      itemsMeta.length > 450 ? itemsMeta.slice(0, 450) : itemsMeta;
    const emailMeta = dto.customerEmail ? String(dto.customerEmail) : undefined;

    // 4) Stripe PaymentIntent with idempotency per-cart
    const intent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { cartId, items: itemsMetaSafe, email: emailMeta }, // 👈 include email for webhook
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

      // Parse items to decrement stock atomically
      let items: Array<{ id: string; qty: number }> = [];
      try {
        if (pi.metadata?.items) items = JSON.parse(String(pi.metadata.items));
      } catch {
        items = [];
      }

      // capture for email after tx
      const emailToNotify: string | undefined =
        (pi.metadata?.email as string) ||
        (pi.receipt_email as string) ||
        undefined;
      let createdNow = false;

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
          createdNow = true;
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

        // 🔻 decrement product stock in the same transaction
        for (const it of items) {
          const pid = String(it.id);
          const qty = Math.max(0, Number(it.qty || 0));
          if (!pid || qty <= 0) continue;
          const pRef = adminDb.collection('products').doc(pid);
          tx.update(pRef, { stock: FieldValue.increment(-qty) });
        }
      });

      // 📧 send confirmation outside the transaction
      if (emailToNotify && this.mailer?.sendOrderConfirmation) {
        try {
          await this.mailer.sendOrderConfirmation(emailToNotify, {
            orderId,
            amount: (pi.amount_received ?? pi.amount) || 0,
            currency: pi.currency ?? null,
            paymentIntentId: pi.id,
            created: createdNow,
          });
        } catch (e) {
          this.logger.warn(
            `sendOrderConfirmation failed: ${(e as Error).message}`,
          );
        }
      }
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

    switch (event.type) {
      case 'payment_intent.succeeded': {
        await handleSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        await handleNonSuccess(
          event.data.object as Stripe.PaymentIntent,
          'payment_failed',
        );
        break;
      }

      case 'payment_intent.canceled': {
        await handleNonSuccess(
          event.data.object as Stripe.PaymentIntent,
          'canceled',
        );
        break;
      }

      case 'charge.refunded': {
        const ch = event.data.object as Stripe.Charge;

        // PaymentIntent id can be a string or object on older types
        const piId =
          typeof ch.payment_intent === 'string'
            ? ch.payment_intent
            : (ch.payment_intent as any)?.id;

        const total = Number(ch.amount ?? 0);
        const refunded = Number(ch.amount_refunded ?? 0);
        const status = refunded >= total ? 'refunded' : 'partially_refunded';

        // capture for email after tx
        let orderIdForEmail: string | undefined;
        const emailFromMeta: string | undefined =
          ((ch.metadata as any)?.email as string) || undefined;

        await adminDb.runTransaction(async (tx) => {
          // ✅ Prefer cartId first, then PI id (fixes test expectation)
          const candidates: string[] = [];
          const cartIdFromCharge = (ch.metadata as any)?.cartId;
          if (cartIdFromCharge) candidates.push(String(cartIdFromCharge));
          if (piId) candidates.push(String(piId));

          for (const oid of candidates) {
            const ref = adminDb.collection('orders').doc(oid);
            const snap = await tx.get(ref);
            if (snap.exists) {
              tx.update(ref, {
                status,
                refundedAmount: refunded,
                refundIds: Array.isArray(ch.refunds?.data)
                  ? ch.refunds!.data.map((r: any) => r.id)
                  : [],
                updatedAt: new Date(),
              });
              orderIdForEmail = oid; // updated one — remember for email
              break;
            }
          }
          // No-op if no matching order doc exists
        });

        // 📧 send refund email after the transaction
        if (emailFromMeta && orderIdForEmail && this.mailer?.sendRefundEmail) {
          try {
            await this.mailer.sendRefundEmail(emailFromMeta, {
              orderId: orderIdForEmail,
              amount: refunded,
              currency: ch.currency ?? null,
              chargeId: ch.id,
              full: status === 'refunded',
              refundIds: Array.isArray(ch.refunds?.data)
                ? ch.refunds!.data.map((r: any) => r.id)
                : [],
            });
          } catch (e) {
            this.logger.warn(`sendRefundEmail failed: ${(e as Error).message}`);
          }
        }

        break;
      }

      default: {
        // For other payment_intent.* events: if PI status is requires_payment_method, update-only
        if (
          typeof event.type === 'string' &&
          event.type.startsWith('payment_intent.')
        ) {
          const pi = event.data.object as Stripe.PaymentIntent;
          if (pi?.status === 'requires_payment_method') {
            await handleNonSuccess(pi, 'requires_payment_method');
          }
        }
        this.logger.log(`Unhandled event: ${event.type}`);
        break;
      }
    }

    return { received: true };
  }
}
