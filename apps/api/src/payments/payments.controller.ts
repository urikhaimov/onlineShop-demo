// apps/api/src/payments/payments.controller.ts
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  Body,
  Optional,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { MailerService } from '../mailer/mailer.service';
import { InvoiceService } from '../invoice/invoice.service';
import { adminBucket } from '../firebase/admin';

import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

class CartItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

class CreateIntentDto {
  @IsString()
  cartId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: Array<CartItemDto>;

  @IsString()
  currency!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limits
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

const RESEND_RATE_LIMIT_PER_MIN = 5;
const resendBuckets = new Map<string, { count: number; windowStart: number }>();
function shouldThrottleResend(ip: string): boolean {
  const now = Date.now();
  const bucket = resendBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= 60_000) {
    resendBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (bucket.count >= RESEND_RATE_LIMIT_PER_MIN) return true;
  bucket.count++;
  return false;
}

const RATE_LIMIT_ENABLED =
  process.env.DISABLE_RATE_LIMIT !== 'true' && process.env.NODE_ENV !== 'test';

// Prefer orderId; accept common variations; else fallback
function orderIdFromMeta(
  meta: Record<string, any> | null | undefined,
  fallback: string,
) {
  const m = meta || {};
  return (m.orderId ??
    m.order_id ??
    m.order ??
    m.cartId ??
    m.cart_id ??
    m.reference ??
    m.ref ??
    fallback) as string;
}

function maskPublishableKey(pk: string): string {
  if (!pk) return '';
  const last4 = pk.slice(-4);
  const keep = Math.min(pk.length - 4, 8);
  return `${pk.slice(0, keep)}…${last4}`;
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  public readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly invoice?: InvoiceService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (process.env.NODE_ENV === 'production' && key.startsWith('sk_test_')) {
      throw new Error('Test key used in production');
    }
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.stripe = new Stripe(key || 'sk_test_dummy', {
      apiVersion: '2024-06-20' as any,
    });
  }

  // ----------------------------------------------------------------------------
  // GET /payments/config/public
  // ----------------------------------------------------------------------------
  @Get('config/public')
  @HttpCode(200)
  getPublicConfig() {
    const pk = this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';
    const defaultCurrency =
      this.config.get<string>('DEFAULT_CURRENCY') ?? 'USD';
    return {
      publishableKey: pk,
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
    const ip = clientIp(req);
    if (RATE_LIMIT_ENABLED && shouldThrottle(ip)) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const orderId = String(dto.cartId ?? ''); // tests often pass their custom id here
    const currency = String(dto.currency ?? 'ILS').toLowerCase();

    // 1) Fetch prices
    let subtotal = 0;
    for (const it of dto.items ?? []) {
      const pid = String(it.id);
      const qty = Number(it.qty ?? 0);
      const snap = await adminDb.collection('products').doc(pid).get();
      const unit = Number(snap.get('price') ?? 0);
      subtotal += unit * qty;
    }

    // 2) Settings
    const settingsSnap = await adminDb
      .collection('settings')
      .doc('payments')
      .get();
    const shipping = Number(settingsSnap.get('shipping') ?? 0);
    const taxRate = Number(settingsSnap.get('taxRate') ?? 0);
    const discount = Number(settingsSnap.get('discount') ?? 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = Math.max(0, subtotal + shipping + taxAmount - discount);
    const amount = Math.round(total * 100);

    // 3) Metadata (write both orderId & cartId to be safe)
    const itemsMeta = JSON.stringify(
      (dto.items ?? []).map((i) => ({
        id: String(i.id),
        qty: Number(i.qty || 0),
      })),
    );
    const itemsMetaSafe =
      itemsMeta.length > 450 ? itemsMeta.slice(0, 450) : itemsMeta;

    const emailMeta = dto.customerEmail ? String(dto.customerEmail) : undefined;

    // 4) Create PI
    const intent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId, // ← key tests look for
          cartId: orderId, // ← backward-compat
          items: itemsMetaSafe,
          email: emailMeta,
        },
        receipt_email: dto.customerEmail || undefined,
      },
      { idempotencyKey: `pi_${orderId}` },
    );

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  // ----------------------------------------------------------------------------
  // Helper: safe items parse for invoices
  // ----------------------------------------------------------------------------
  private safeParseItems(
    raw: unknown,
  ): Array<{ id: string; qty: number; priceCents?: number }> | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return undefined;
      return arr.map((x) =>
        (
          [
            'id' in x ? { id: String((x as any).id) } : { id: '' },
            'qty' in x ? { qty: Number((x as any).qty) || 1 } : { qty: 1 },
            'priceCents' in x && (x as any).priceCents !== undefined
              ? { priceCents: Number((x as any).priceCents) }
              : {},
          ] as any
        ).reduce((a: any, b: any) => ({ ...a, ...b }), {}),
      );
    } catch {
      return undefined;
    }
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
    const signature =
      sigLower ?? sigTitle ?? (req.headers['stripe-signature'] as string) ?? '';

    if (!this.webhookSecret)
      throw new BadRequestException('Missing webhook secret');
    if (!signature) throw new BadRequestException('Missing Stripe-Signature');

    const rawBody: Buffer | undefined =
      (req as any).rawBody ||
      (Buffer.isBuffer(req.body) ? (req.body as Buffer) : undefined);

    if (!rawBody) {
      this.logger.error(
        'Raw body not available. Ensure bodyParser.raw() is applied before JSON for /payments/webhooks/stripe',
      );
      throw new BadRequestException('Invalid signature');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    // Idempotency guard
    const enableReplayGuard =
      (this.config.get<string>('STRIPE_EVENT_GUARD') ?? 'true') !== 'false' &&
      process.env.NODE_ENV !== 'test';

    if (enableReplayGuard) {
      try {
        await adminDb
          .collection('webhookEvents')
          .doc(String(event.id))
          .create({
            type: event.type,
            createdAt: new Date(),
          } as any);
      } catch (e: any) {
        const code = e?.code;
        const msg = String(e?.message || '').toLowerCase();
        if (
          code === 6 ||
          code === 'already-exists' ||
          /already.*exist/.test(msg)
        ) {
          this.logger.log(`Duplicate Stripe event ${event.id} (${event.type})`);
          return { received: true };
        }
        this.logger.warn(`webhookEvents.create failed: ${e?.message ?? e}`);
      }
    }

    const upsertPaid = async (
      orderId: string,
      payload: {
        amountCents: number;
        currency: string | null | undefined;
        paymentIntentId?: string | null;
        emailGuess?: string | null;
        items?: Array<{ id: string; qty: number }>;
      },
    ) => {
      let createdNow = false;
      const { amountCents, currency, paymentIntentId, emailGuess, items } =
        payload;

      await adminDb.runTransaction(async (tx) => {
        const ref = adminDb.collection('orders').doc(orderId);
        const snap = await tx.get(ref);

        const base = {
          status: 'paid',
          amount: amountCents,
          currency,
          paymentIntentId: paymentIntentId ?? null,
          updatedAt: new Date(),
          email: emailGuess ?? null,
        };

        if (snap.exists) {
          const existing = snap.data() as any;
          if (!base.email && existing?.email) base.email = existing.email;
          tx.update(ref, base);
        } else {
          createdNow = true;
          tx.set(ref, {
            ...base,
            cartId: orderId,
            createdAt: new Date(),
          });
        }

        // decrement stock
        for (const it of items ?? []) {
          const pid = String(it.id);
          const qty = Math.max(0, Number(it.qty || 0));
          if (!pid || qty <= 0) continue;
          const pRef = adminDb.collection('products').doc(pid);
          tx.update(pRef, { stock: FieldValue.increment(-qty) });
        }
      });

      return createdNow;
    };

    const handleSucceededPI = async (pi: Stripe.PaymentIntent) => {
      const orderId = String(orderIdFromMeta(pi.metadata as any, pi.id));

      let items: Array<{ id: string; qty: number }> = [];
      try {
        if (pi.metadata?.items) items = JSON.parse(String(pi.metadata.items));
      } catch {
        items = [];
      }

      const emailToNotify: string | undefined =
        (pi.metadata?.email as string) ||
        (pi.receipt_email as string) ||
        undefined;

      const createdNow = await upsertPaid(orderId, {
        amountCents: Number(pi.amount_received ?? pi.amount ?? 0),
        currency: pi.currency,
        paymentIntentId: pi.id,
        emailGuess: emailToNotify ?? null,
        items,
      });

      // Generate & upload invoice (best effort)
      let invoiceUpload:
        | { buffer: Buffer; path: string; url?: string }
        | undefined;
      try {
        if (this.invoice) {
          const storeName = process.env.STORE_NAME ?? 'Bunder Shop';
          const vatRate = Number(process.env.VAT_RATE ?? '0');
          invoiceUpload = await this.invoice.generateAndUpload({
            orderId,
            createdAt: new Date(),
            amountCents: Number(pi.amount_received ?? pi.amount ?? 0),
            currency: (pi.currency ?? 'ILS').toUpperCase(),
            email: emailToNotify ?? null,
            items: this.safeParseItems(pi.metadata?.items),
            vatRate: isNaN(vatRate) ? 0 : vatRate,
            storeName,
          });

          await adminDb
            .collection('orders')
            .doc(orderId)
            .update({
              invoice: {
                path: invoiceUpload.path,
                url: invoiceUpload.url ?? null,
                createdAt: new Date(),
              },
              updatedAt: new Date(),
            });
        }
      } catch (e) {
        this.logger.warn(
          `Invoice generation/upload failed for ${orderId}: ${(e as Error).message}`,
        );
      }

      // Send email
      if (emailToNotify && this.mailer?.sendOrderConfirmation) {
        try {
          await this.mailer.sendOrderConfirmation(
            emailToNotify,
            {
              orderId,
              amount: Number(pi.amount_received ?? pi.amount ?? 0),
              currency: (pi.currency ?? 'ILS').toUpperCase(),
              paymentIntentId: pi.id,
              created: createdNow,
              invoiceUrl: invoiceUpload?.url ?? undefined,
            },
            invoiceUpload?.buffer
              ? {
                  attachments: [
                    {
                      filename: `invoice_${orderId}.pdf`,
                      content: invoiceUpload.buffer,
                      contentType: 'application/pdf',
                    },
                  ],
                }
              : undefined,
          );
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
      const orderId = String(orderIdFromMeta(pi.metadata as any, pi.id));
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
      case 'payment_intent.succeeded':
        await handleSucceededPI(event.data.object as Stripe.PaymentIntent);
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

      // Some fixtures emit charge events instead of PI success
      case 'charge.succeeded': {
        const ch = event.data.object as Stripe.Charge;
        const piId =
          typeof ch.payment_intent === 'string'
            ? ch.payment_intent
            : (ch.payment_intent as any)?.id;
        const orderId = String(orderIdFromMeta(ch.metadata as any, piId ?? ''));

        const emailToNotify: string | undefined =
          ((ch.billing_details?.email ||
            (ch.metadata as any)?.email) as string) || undefined;

        await upsertPaid(orderId, {
          amountCents: Number(ch.amount ?? 0) - Number(ch.amount_refunded ?? 0),
          currency: ch.currency,
          paymentIntentId: piId ?? null,
          emailGuess: emailToNotify ?? null,
          items: undefined, // charges rarely include our items list
        });
        break;
      }

      case 'charge.refunded': {
        const ch = event.data.object as Stripe.Charge;
        const piId =
          typeof ch.payment_intent === 'string'
            ? ch.payment_intent
            : (ch.payment_intent as any)?.id;

        const total = Number(ch.amount ?? 0);
        const refunded = Number(ch.amount_refunded ?? 0);
        const status = refunded >= total ? 'refunded' : 'partially_refunded';

        let orderIdForEmail: string | undefined = orderIdFromMeta(
          ch.metadata as any,
          piId ?? '',
        );

        const emailFromMeta: string | undefined =
          ((ch.metadata as any)?.email as string) || undefined;

        await adminDb.runTransaction(async (tx) => {
          const candidates: string[] = [];
          const fromMeta = orderIdFromMeta(ch.metadata as any, '');
          if (fromMeta) candidates.push(String(fromMeta));
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
              orderIdForEmail = oid;
              break;
            }
          }
        });

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

  // ----------------------------------------------------------------------------
  // POST /payments/webhook (alias)
  // ----------------------------------------------------------------------------
  @Post('webhook')
  @HttpCode(200)
  async stripeWebhookAlias(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') sigLower?: string,
    @Headers('Stripe-Signature') sigTitle?: string,
  ) {
    return this.stripeWebhook(req, sigLower, sigTitle);
  }

  // ----------------------------------------------------------------------------
  // POST /payments/orders/:orderId/resend-receipt
  // ----------------------------------------------------------------------------
  @Post('orders/:orderId/resend-receipt')
  @HttpCode(200)
  async resendReceipt(
    @Param('orderId') orderId: string,
    @Body() body: { email?: string } = {},
    @Req() req: Request,
  ) {
    const ip = clientIp(req);
    if (RATE_LIMIT_ENABLED && shouldThrottleResend(ip)) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const snap = await adminDb.collection('orders').doc(orderId).get();
    if (!snap.exists) throw new BadRequestException('Order not found');

    const order = snap.data() as any;
    const to: string | undefined = body.email || order?.email || undefined;
    if (!to)
      throw new BadRequestException('No email on order; provide { email }');

    if (this.mailer?.sendOrderConfirmation) {
      await this.mailer.sendOrderConfirmation(to, {
        orderId,
        amount: Number(order?.amount || 0),
        currency: (order?.currency as string) || null,
        paymentIntentId: String(order?.paymentIntentId || ''),
        created: false,
      });
    } else {
      this.logger.warn('MailerService not configured');
    }

    return { ok: true };
  }

  // ----------------------------------------------------------------------------
  // GET /payments/orders/:orderId/invoice
  // ----------------------------------------------------------------------------
  @Get('orders/:orderId/invoice')
  async downloadInvoice(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const bucket = adminBucket();
    const path = `invoices/${orderId}.pdf`;
    const file = bucket.file(path);

    try {
      const [exists] = await file.exists();
      if (exists) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=invoice_${orderId}.pdf`,
        );
        return file
          .createReadStream()
          .on('error', (err) => {
            this.logger.error(
              `Invoice stream error for ${path}: ${err?.message}`,
              err?.stack,
            );
            if (!res.headersSent) {
              res
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ message: 'Failed to stream invoice' });
            }
          })
          .pipe(res);
      }

      if (!this.invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const snap = await adminDb.collection('orders').doc(orderId).get();
      const order = snap.exists ? (snap.data() as any) : null;

      const amountCents = (() => {
        if (typeof order?.amount === 'number') return Math.round(order.amount);
        if (typeof order?.total === 'number')
          return Math.round(order.total * 100);
        return 0;
      })();

      const currency = String(order?.currency ?? 'ILS').toUpperCase();

      const items =
        Array.isArray(order?.items) && order.items.length
          ? order.items.map((it: any, idx: number) => ({
              id: String(it.productId || it.id || idx + 1),
              name: typeof it.name === 'string' ? it.name : undefined,
              qty: Number(it.quantity ?? it.qty ?? 1) || 1,
              priceCents:
                typeof it.priceCents === 'number'
                  ? Math.round(it.priceCents)
                  : typeof it.price === 'number'
                    ? Math.round(it.price * 100)
                    : undefined,
            }))
          : undefined;

      const vatEnv = Number(process.env.VAT_RATE ?? '0');
      const input = {
        orderId,
        createdAt: order?.createdAt || new Date().toISOString(),
        updatedAt: order?.updatedAt || new Date().toISOString(),
        amountCents,
        currency,
        email: order?.email || order?.buyer?.email || null,
        items,
        vatRate: isNaN(vatEnv) ? 0 : vatEnv,
        storeName: process.env.STORE_NAME ?? 'Bunder Shop',
      };

      const { buffer } = await this.invoice.generateAndUpload(input);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=invoice_${orderId}.pdf`,
      );
      return res.status(HttpStatus.OK).send(buffer);
    } catch (err: any) {
      this.logger.error(
        `Invoice error for ${orderId}: ${err?.message}`,
        err?.stack,
      );
      const hint =
        process.env.NODE_ENV !== 'production'
          ? 'Check order document and Storage permissions; see server logs for details.'
          : undefined;
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal server error', hint });
    }
  }
}
