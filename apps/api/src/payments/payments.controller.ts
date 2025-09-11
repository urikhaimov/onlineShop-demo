// apps/api/src/payments/payments.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  Logger,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { adminDb } from '@common/firebase';

type CartItem = { id: string; qty: number };

type CreateIntentDto = {
  cartId: string; // stable id to use as idempotency key
  items: CartItem[]; // client-sent items (server recomputes prices)
  currency?: string; // defaults to ILS on server
  customerEmail?: string | null; // optional
};

type CurrencyCode = 'ILS' | 'USD' | 'EUR' | string;
type RawRequest = Request & { rawBody?: Buffer | string };

/** Helper to safely get a number (minor units) or undefined. */
function asNumber(x: unknown): number | undefined {
  return typeof x === 'number' && Number.isFinite(x) ? x : undefined;
}

/** Extract PaymentIntent ID from a Stripe event/object in a type-safe way. */
function getPaymentIntentIdFromEvent(event: Stripe.Event): string | undefined {
  const obj = event.data.object as
    | Stripe.PaymentIntent
    | Stripe.Charge
    | Record<string, any>;
  if ('object' in obj) {
    if (obj.object === 'payment_intent') {
      return (obj as Stripe.PaymentIntent).id;
    }
    if (obj.object === 'charge') {
      const pi = (obj as Stripe.Charge).payment_intent;
      return typeof pi === 'string' ? pi : undefined;
    }
  }
  const anyObj = obj as any;
  return anyObj?.payment_intent ?? anyObj?.id ?? undefined;
}

/** Extract amount (minor units) and currency from a Stripe event/object. */
function getAmountAndCurrencyFromEvent(event: Stripe.Event): {
  amountMinor?: number;
  currencyUpper?: CurrencyCode;
} {
  const obj = event.data.object as
    | Stripe.PaymentIntent
    | Stripe.Charge
    | Record<string, any>;

  if ('object' in obj && obj.object === 'payment_intent') {
    const pi = obj as Stripe.PaymentIntent;
    const amountMinor =
      asNumber(pi.amount_received) ?? asNumber(pi.amount) ?? undefined;
    const currencyUpper = (
      pi.currency ? pi.currency.toUpperCase() : undefined
    ) as CurrencyCode | undefined;
    return { amountMinor, currencyUpper };
  }

  if ('object' in obj && obj.object === 'charge') {
    const ch = obj as Stripe.Charge;
    const amountMinor = asNumber(ch.amount);
    const currencyUpper = (
      ch.currency ? ch.currency.toUpperCase() : undefined
    ) as CurrencyCode | undefined;
    return { amountMinor, currencyUpper };
  }

  const anyObj = obj as any;
  const amountMinor =
    asNumber(anyObj?.amount_received) ?? asNumber(anyObj?.amount) ?? undefined;
  const currencyUpper = anyObj?.currency
    ? String(anyObj.currency).toUpperCase()
    : undefined;
  return { amountMinor, currencyUpper };
}

@Controller('payments')
export class PaymentsController {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsController.name);
  private readonly webhookSecret?: string;

  constructor(cfg: ConfigService) {
    const sk = cfg.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = cfg.get<string>('STRIPE_WEBHOOK_SECRET'); // from Stripe Dashboard/CLI
    if (!sk) throw new Error('Missing STRIPE_SECRET_KEY');

    // ✅ Pin a stable API version to avoid silent behavior changes
    this.stripe = new Stripe(sk, {
      apiVersion: '2025-07-30.basil' as Stripe.LatestApiVersion,
      appInfo: { name: 'Shop API', version: '1.0.0' },
      maxNetworkRetries: 2, // tests only; consider 2 in prod
    });
  }

  /**
   * Create a PaymentIntent on the server, using idempotency and recomputed totals.
   */
  @Post('create-intent')
  @HttpCode(201)
  async createIntent(
    @Body() dto: CreateIntentDto,
  ): Promise<{ clientSecret: string | null; paymentIntentId: string }> {
    const currency = (dto.currency ?? 'ILS').toUpperCase();

    // 1) Recompute amount on server (authoritative pricing)
    const { amountMinor } = await this.computeAmount(dto.items, currency);

    // 2) Persist/merge a checkout draft (optional but recommended)
    await adminDb.collection('checkouts').doc(dto.cartId).set(
      {
        amountMinor,
        currency,
        items: dto.items,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    // 3) Create PaymentIntent (idempotency key per cart)
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: amountMinor, // minor units (agorot/cent)
        currency: currency.toLowerCase(),
        receipt_email: dto.customerEmail ?? undefined,
        automatic_payment_methods: { enabled: true },
        metadata: { cartId: dto.cartId },
      },
      { idempotencyKey: `pi_${dto.cartId}` },
    );

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  /**
   * Webhook endpoint for Stripe events.
   * ✅ Relies on Nest app created with { rawBody: true } so `req.rawBody` is available.
   */
  @Post('/webhooks/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawRequest,
    @Res() res: Response,
    @Headers('stripe-signature') signature?: string,
  ): Promise<Response> {
    let event: Stripe.Event;

    try {
      if (!this.webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
      if (!signature) return res.status(400).send('Missing signature');

      // Use the exact raw payload — do NOT stringify/parse before verification
      const rawBody: Buffer | string =
        req.rawBody ??
        (Buffer.isBuffer((req as any).body)
          ? (req as any).body
          : typeof (req as any).body === 'string'
            ? (req as any).body
            : Buffer.from(JSON.stringify((req as any).body ?? {})));

      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return res.status(400).send('Bad signature');
    }

    const paymentIntentId = getPaymentIntentIdFromEvent(event);
    const { amountMinor, currencyUpper } = getAmountAndCurrencyFromEvent(event);

    try {
      switch (event.type) {
        case 'payment_intent.processing':
          await this.upsertOrder(
            paymentIntentId,
            'processing',
            amountMinor,
            currencyUpper,
            event,
          );
          break;

        case 'payment_intent.succeeded':
          await this.upsertOrder(
            paymentIntentId,
            'succeeded',
            amountMinor,
            currencyUpper,
            event,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.upsertOrder(
            paymentIntentId,
            'failed',
            amountMinor,
            currencyUpper,
            event,
          );
          break;

        case 'charge.refunded':
          await this.markRefunded(paymentIntentId);
          break;

        default:
          // Ignore other events in V1
          break;
      }
    } catch (e) {
      this.logger.error(
        `Webhook handling error: ${e instanceof Error ? e.message : String(e)}`,
      );
      // Intentionally return 200 to avoid perpetual Stripe retries while you fix non-fatal issues.
    }

    return res.send({ received: true });
  }

  /** Server-side total computation from authoritative product prices and order settings. */
  private async computeAmount(
    items: CartItem[],
    currency: CurrencyCode,
  ): Promise<{ amountMinor: number; currency: CurrencyCode }> {
    let sumMinor = 0;

    // Load product prices and accumulate in minor units
    await Promise.all(
      (items || []).map(async (it) => {
        const snap = await adminDb.collection('products').doc(it.id).get();
        const priceMajor = Number(snap?.get?.('price') ?? 0); // stored in major units
        const qty = Number(it.qty ?? 0);
        if (Number.isFinite(priceMajor) && Number.isFinite(qty) && qty > 0) {
          const priceMinor = Math.round(priceMajor * 100);
          sumMinor += priceMinor * qty;
        }
      }),
    );

    // Settings (shipping / tax / discount), stored in major units
    const settingsSnap = await adminDb
      .collection('settings')
      .doc('order')
      .get();

    const shippingMinor = Math.round(
      Number(settingsSnap?.get?.('shipping') ?? 0) * 100,
    );
    const discountMinor = Math.round(
      Number(settingsSnap?.get?.('discount') ?? 0) * 100,
    );
    const taxRate = Number(settingsSnap?.get?.('taxRate') ?? 0); // percent

    const subtotalWithShippingMinor = Math.max(0, sumMinor + shippingMinor);
    const taxedMinor = Math.round(
      subtotalWithShippingMinor * (1 + taxRate / 100),
    );
    const amountMinor = Math.max(0, taxedMinor - discountMinor);

    return { amountMinor, currency };
  }

  /** Idempotent upsert of an order document keyed by PaymentIntent ID. */
  private async upsertOrder(
    paymentIntentId: string | undefined,
    status: 'processing' | 'succeeded' | 'failed',
    amountMinor?: number,
    currencyUpper?: CurrencyCode,
    event?: Stripe.Event,
  ): Promise<void> {
    if (!paymentIntentId) return;

    const ref = adminDb.collection('orders').doc(paymentIntentId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      const base = {
        payment: {
          method: 'card' as const,
          provider: 'stripe' as const,
          paymentIntentId,
          status,
          amountMinor: amountMinor ?? null, // minor units (e.g., agorot)
          currency: (currencyUpper ?? 'ILS') as CurrencyCode,
          lastEventType: event?.type ?? null,
        },
        updatedAt: new Date().toISOString(),
      };

      if (!snap.exists) {
        // Create on first webhook only (idempotent by doc id = PI id)
        const metadata =
          (event?.data.object as any)?.metadata ??
          ({} as Record<string, string>);
        const cartId =
          typeof metadata?.cartId === 'string' ? metadata.cartId : 'unknown';

        // Optionally hydrate items from the checkout draft:
        let items: CartItem[] = [];
        try {
          const draftSnap = await tx.get(
            adminDb.collection('checkouts').doc(cartId),
          );
          const draftItems = draftSnap.get('items');
          if (Array.isArray(draftItems)) {
            items = draftItems.filter(
              (it) =>
                it &&
                typeof it.id === 'string' &&
                Number.isFinite(Number(it.qty)),
            ) as CartItem[];
          }
        } catch {
          // best-effort only
        }

        tx.set(ref, {
          id: paymentIntentId,
          status: status === 'succeeded' ? 'paid' : status,
          items,
          ...base,
          createdAt: new Date().toISOString(),
          statusHistory: [
            { status: base.payment.status, ts: new Date().toISOString() },
          ],
        });
      } else {
        tx.update(ref, {
          status: status === 'succeeded' ? 'paid' : status,
          ...base,
          statusHistory: admin.firestore.FieldValue.arrayUnion({
            status: base.payment.status,
            ts: new Date().toISOString(),
          }),
        } as Record<string, unknown>);
      }
    });
  }

  /** Mark an order refunded by PaymentIntent ID (optional for V1). */
  private async markRefunded(paymentIntentId?: string): Promise<void> {
    if (!paymentIntentId) return;
    const ref = adminDb.collection('orders').doc(paymentIntentId);
    await ref.set(
      {
        payment: { status: 'refunded' },
        status: 'refunded',
        updatedAt: new Date().toISOString(),
        statusHistory: [
          {
            status: 'refunded',
            ts: new Date().toISOString(),
          },
        ],
      },
      { merge: true },
    );
  }
}
