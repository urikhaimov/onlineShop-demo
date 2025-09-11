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
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';
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

// ─────────────────────────────────────────────────────────────────────────────
// Simple in-memory rate limiter (10 requests/min per IP) for create-intent
// ─────────────────────────────────────────────────────────────────────────────
const RATE_LIMIT_PER_MIN = 10;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return xff.split(',')[0]?.trim() || (req.socket?.remoteAddress ?? 'unknown');
}
function shouldThrottle(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= 60_000) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return true;
  bucket.count++;
  return false;
}

// Mask publishable key like: pk_live_…7890
function maskPublishableKey(pk: string): string {
  if (!pk) return '';
  const last4 = pk.slice(-4);
  const keep = Math.min(pk.length - 4, 8); // keep up to first 8 chars
  return `${pk.slice(0, keep)}…${last4}`;
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  public readonly stripe: Stripe; // public for tests to spy
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject('MAIL_SERVICE') private readonly mailer?: MailerLike,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    // 🚫 Guard: never allow test keys in production
    if (process.env.NODE_ENV === 'production' && key.startsWith('sk_test_')) {
      throw new Error('Test key used in production');
    }
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.stripe = new Stripe(key || 'sk_test_dummy', {
      apiVersion: '2024-06-20' as any,
    });
  }

  // ----------------------------------------------------------------------------
  // GET /payments/config/public — minimal public config for the client
  // ----------------------------------------------------------------------------
  @Get('config/public')
  @HttpCode(200)
  getPublicConfig() {
    const pk = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';
    const defaultCurrency =
      this.config.get<string>('DEFAULT_CURRENCY') ?? 'USD';
    return {
      publishableKeyMasked: maskPublishableKey(pk),
      defaultCurrency,
    };
  }

  // ----------------------------------------------------------------------------
  // POST /payments/create-intent
  // ----------------------------------------------------------------------------
  @Post('create-intent')
  @HttpCode(201)
  async createPaymentIntent(@Req() req: Request, @Body() dto: CreateIntentDto) {
    // ⏱️ rate-limit per IP (10/min)
    const ip = clientIp(req);
    if (shouldThrottle(ip)) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

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
    const itemsMetaSafe =
      itemsMeta.length > 450 ? itemsMeta.slice(0, 450) : itemsMeta;
    const emailMeta = dto.customerEmail ? String(dto.customerEmail) : undefined;

    // 4) Stripe PaymentIntent with idempotency per-cart
    const intent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { cartId, items: itemsMetaSafe, email: emailMeta },
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
  // IMPORTANT: ensure route-scoped raw() middleware is applied to this exact path:
  // consumer.apply(raw({ type: 'application/json' })).forRoutes({ path: 'payments/webhooks/stripe', method: RequestMethod.POST })
  // ----------------------------------------------------------------------------
  @Post('webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') sigLower?: string,
    @Headers('Stripe-Signature') sigTitle?: string,
  ) {
    // Express normalizes header names to lowercase, but handle both just in case:
    const signature =
      sigLower ?? sigTitle ?? (req.headers['stripe-signature'] as string) ?? '';

    if (!this.webhookSecret) {
      throw new BadRequestException('Missing webhook secret');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature');
    }

    // ✅ Use the exact raw bytes. If this is missing, signature verification will fail.
    const rawBody: Buffer | undefined =
      (req as any).rawBody ||
      (Buffer.isBuffer(req.body) ? (req.body as Buffer) : undefined);

    if (!rawBody) {
      this.logger.error(
        'Raw body not available. Ensure express.raw({ type: "application/json" }) is applied to /payments/webhooks/stripe',
      );
      throw new BadRequestException('Invalid signature');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody, // Buffer
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

        // Prefer cartId from metadata for both lookup and email
        const cartIdFromCharge = (ch.metadata as any)?.cartId;
        const piId =
          typeof ch.payment_intent === 'string'
            ? ch.payment_intent
            : (ch.payment_intent as any)?.id;

        const total = Number(ch.amount ?? 0);
        const refunded = Number(ch.amount_refunded ?? 0);
        const status = refunded >= total ? 'refunded' : 'partially_refunded';

        // capture for email after tx – default to cartId if present
        let orderIdForEmail: string | undefined = cartIdFromCharge
          ? String(cartIdFromCharge)
          : piId
            ? String(piId)
            : undefined;

        const emailFromMeta: string | undefined =
          ((ch.metadata as any)?.email as string) || undefined;

        await adminDb.runTransaction(async (tx) => {
          // 🔎 Try updating by cartId first, then by PI id
          const candidates: string[] = [];
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
              // keep cartId-preferred orderIdForEmail if present; otherwise use the updated id
              if (!cartIdFromCharge) orderIdForEmail = oid;
              break;
            }
          }
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
