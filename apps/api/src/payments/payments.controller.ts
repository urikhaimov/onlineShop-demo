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
import { MailerService } from '../mailer/mailer.service';
import { InvoiceService } from '../invoice/invoice.service';
import { adminBucket } from '../firebase/admin';

import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsString,
  IsInt,
  Min,
  IsOptional,
  ArrayMinSize,
  IsIn,
} from 'class-validator';

class CartItemDto {
  @IsString()
  id!: string;

  @Transform(({ value }) => Number(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number;
}

class CreateIntentDto {
  @IsString()
  cartId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: Array<CartItemDto>;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['ils', 'usd'], { message: 'currency must be ils or usd' })
  currency?: 'ils' | 'usd';

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

// Support both styles of env flags
const RATE_LIMIT_ENABLED =
  process.env.RATE_LIMIT_ENABLED === '1' ||
  (process.env.DISABLE_RATE_LIMIT !== 'true' &&
    process.env.NODE_ENV !== 'test');

function maskPublishableKey(pk: string): string {
  if (!pk) return '';
  const last4 = pk.slice(-4);
  const keep = Math.min(pk.length - 4, 8);
  return `${pk.slice(0, keep)}…${last4}`;
}

// Stripe allows idempotency keys up to 255 chars
function buildIdemKey(
  headerKey: string | undefined,
  orderId: string,
  amountCents: number,
  currency: string,
) {
  const fallback = `pi_${orderId}_${amountCents}_${currency}`; // stable per cart+amount+currency
  const key = (headerKey || fallback).trim();
  return key.length > 255 ? key.slice(0, 255) : key;
}

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  public readonly stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly invoice?: InvoiceService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (process.env.NODE_ENV === 'production' && key.startsWith('sk_test_')) {
      throw new Error('Test key used in production');
    }
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
    const defaultCurrency = (
      this.config.get<string>('DEFAULT_CURRENCY') ?? 'ils'
    ).toUpperCase();
    return {
      publishableKey: pk,
      publishableKeyMasked: maskPublishableKey(pk),
      defaultCurrency,
    };
  }

  // ----------------------------------------------------------------------------
  // POST /payments/create-payment-intent
  //  • Accepts optional Idempotency-Key header (recommended)
  //  • Calculates totals from Firestore products + settings (in MINOR units)
  //  • Writes metadata (orderId, items, email)
  // ----------------------------------------------------------------------------
  @Post('create-payment-intent')
  @HttpCode(201)
  async createPaymentIntent(
    @Req() req: Request,
    @Body() dto: CreateIntentDto,
    @Headers('idempotency-key') idemLower?: string,
    @Headers('Idempotency-Key') idemTitle?: string,
  ) {
    const ip = clientIp(req);
    if (RATE_LIMIT_ENABLED && shouldThrottle(ip)) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!dto?.cartId || !Array.isArray(dto?.items) || dto.items.length === 0) {
      throw new BadRequestException('Invalid cart payload');
    }

    const orderId = String(dto.cartId);
    const defaultCur = (
      this.config.get<string>('DEFAULT_CURRENCY') ?? 'ils'
    ).toLowerCase();
    const currency = String(dto.currency ?? defaultCur).toLowerCase();

    // 1) Fetch prices → subtotal **in cents**
    let subtotalCents = 0;
    for (const it of dto.items) {
      const pid = String(it.id);
      const qty = Number(it.qty ?? 0);
      if (!pid || qty <= 0) continue;
      const snap = await adminDb.collection('products').doc(pid).get();
      if (!snap.exists) {
        this.logger.warn(
          `Product ${pid} not found while creating PI for ${orderId}`,
        );
        continue;
      }
      const unitMajor = Number(snap.get('price') ?? 0);
      const unitCents = Math.round(unitMajor * 100);
      subtotalCents += unitCents * qty;
    }

    // 2) Settings (kept in major units in DB) → convert to cents
    const settingsSnap = await adminDb
      .collection('settings')
      .doc('payments')
      .get();

    const shippingMajor = Number(settingsSnap.get('shipping') ?? 0);
    const taxRate = Number(settingsSnap.get('taxRate') ?? 0); // percent
    const discountMajor = Number(settingsSnap.get('discount') ?? 0);

    const shippingCents = Math.round(shippingMajor * 100);
    const discountCents = Math.round(discountMajor * 100);
    const taxCents = Math.round(subtotalCents * (taxRate / 100));

    const amount = Math.max(
      0,
      subtotalCents + shippingCents + taxCents - discountCents,
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Cart total must be greater than zero');
    }

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

    const headerKey = (idemLower || idemTitle) ?? undefined;
    const idempotencyKey = buildIdemKey(headerKey, orderId, amount, currency);

    try {
      // 4) Create PI (card-only; avoids Link/APM misconfig)
      const intent = await this.stripe.paymentIntents.create(
        {
          amount,
          currency,
          payment_method_types: ['card'],
          payment_method_options: {
            card: { request_three_d_secure: 'automatic' },
          },
          metadata: {
            orderId, // tests look for this
            cartId: orderId, // backward-compat
            items: itemsMetaSafe,
            email: emailMeta,
          },
          receipt_email: dto.customerEmail || undefined,
        },
        { idempotencyKey },
      );

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      };
    } catch (err: any) {
      const msg =
        err?.raw?.message || err?.message || 'Failed to create PaymentIntent';
      this.logger.error(
        `create-intent failed for ${orderId}: ${msg} (${idempotencyKey})`,
        err?.stack,
      );
      throw new HttpException(msg, HttpStatus.BAD_GATEWAY);
    }
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
    const to: string | undefined =
      body.email ||
      order?.email ||
      order?.buyer?.email ||
      order?.customer?.email ||
      undefined;
    if (!to)
      throw new BadRequestException('No email on order; provide { email }');

    // Try to ensure invoice and include it (URL and/or attachment)
    let invoiceUrl: string | undefined;
    let attachments:
      | Array<{
          filename: string;
          content: Buffer;
          contentType: string;
        }>
      | undefined;

    try {
      if (this.invoice?.ensureInvoice) {
        const inv = await this.invoice.ensureInvoice(orderId, { force: false });
        invoiceUrl = inv?.url;
        if (inv?.buffer && inv.buffer.length) {
          attachments = [
            {
              filename: `invoice_${orderId}.pdf`,
              content: inv.buffer,
              contentType: 'application/pdf',
            },
          ];
        }
      } else if (this.invoice?.generateAndUpload) {
        const inv = await this.invoice.generateAndUpload({
          orderId,
          createdAt: order?.createdAt || new Date().toISOString(),
          amountCents:
            typeof order?.amount === 'number'
              ? Math.round(order.amount)
              : typeof order?.total === 'number'
                ? Math.round(order.total * 100)
                : 0,
          currency: String(order?.currency ?? 'ILS').toUpperCase(),
          email: order?.email || order?.buyer?.email || null,
          items: Array.isArray(order?.items) ? order.items : undefined,
          vatRate: Number(process.env.VAT_RATE ?? '0') || 0,
          storeName: process.env.STORE_NAME ?? 'Bunder Shop',
        });
        invoiceUrl = inv?.url;
        if (inv?.buffer && inv.buffer.length) {
          attachments = [
            {
              filename: `invoice_${orderId}.pdf`,
              content: inv.buffer,
              contentType: 'application/pdf',
            },
          ];
        }
      }
    } catch {
      // non-fatal
    }

    if (this.mailer?.sendOrderConfirmation) {
      await this.mailer.sendOrderConfirmation(
        to,
        {
          orderId,
          amount: Number(
            order?.amount ??
              (typeof order?.total === 'number'
                ? Math.round(order.total * 100)
                : 0),
          ),
          currency: (order?.currency as string) || null,
          paymentIntentId: String(order?.paymentIntentId || ''),
          created: false,
          invoiceUrl, // ✅ include for templates
        },
        attachments ? { attachments } : undefined,
      );
    } else {
      this.logger.warn('MailerService not configured');
    }

    // optional: mark resend time
    await adminDb
      .collection('orders')
      .doc(orderId)
      .set({ receiptResentAt: new Date().toISOString() } as any, {
        merge: true,
      });

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
