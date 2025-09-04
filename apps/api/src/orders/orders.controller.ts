// apps/api/src/orders/orders.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Headers,
  HttpCode,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

import { OrdersService } from './orders.service';

// ── utils (all small & reusable) ──────────────────────────────────────────────
import { minorToMajor } from './utils/currency.util';
import { clampMinorForCurrency } from './utils/payment.util';
import { cartSignature } from './utils/cart.util';
import {
  isValidPaymentIntentId,
  composePIIdempotencyKey, // returns a sanitized, header-safe key
} from './utils/stripe.util';
import { getStripeRawBody } from './utils/request.util';
// (optional) others you created:
// import { maskEmail } from './utils/hash.util';
// import { safeDate } from './utils/time.util';

type AuthedUser = { uid: string; role?: string };
type AuthedRequest = Request & { user: AuthedUser };

interface RawBodyRequest extends Request {
  rawBody?: Buffer; // provided by bodyParser.raw in main.ts
}

@Controller('orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  // ── Reads ───────────────────────────────────────────────────────────────────

  @Get('mine')
  @Roles('user', 'admin', 'superadmin')
  getMyOrders(@Req() req: AuthedRequest) {
    this.logger.log(`GET /orders/mine uid=${req.user.uid}`);
    return this.ordersService.getOrdersByUserId(req.user.uid);
  }

  @Get()
  @Roles('admin', 'superadmin')
  getAllOrders() {
    this.logger.log('GET /orders');
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @Roles('user', 'admin', 'superadmin')
  getOrderById(@Req() req: AuthedRequest, @Param('id') id: string) {
    const orderId = (id || '').trim();
    this.logger.log(`GET /orders/${orderId} uid=${req.user.uid}`);
    return this.ordersService.getOrderById(
      req.user.uid,
      orderId,
      req.user.role || 'user',
    );
  }

  // Public polling by PaymentIntent id (what the client uses after checkout)
  @Public()
  @Get('public/:piId')
  getPublicByPaymentIntent(@Param('piId') piId: string) {
    const safe = (piId || '').trim();
    if (!isValidPaymentIntentId(safe)) {
      throw new BadRequestException('Invalid payment intent id');
    }
    this.logger.log(`GET /orders/public/${safe}`);
    return this.ordersService.getPublicStatusByPaymentIntent(safe);
  }

  // Optional: minimal public read by ORDER id (after you already know orderId)
  @Public()
  @Get('public/order/:id')
  async getOrderPublicById(@Param('id') id: string) {
    const safeId = (id || '').trim();
    const doc = await this.ordersService.getOrderDoc(safeId);
    if (!doc) throw new NotFoundException('Order not found');
    return {
      id: safeId,
      status: doc.status,
      amount: doc.totalAmount, // stored MINOR units
      currency: doc.payment?.currency,
      updatedAt: doc.updatedAt,
    };
  }

  // ── Mutations ───────────────────────────────────────────────────────────────

  @Post()
  @Roles('user', 'admin', 'superadmin')
  async createOrder(@Req() req: AuthedRequest, @Body() dto: any) {
    this.logger.log(`POST /orders uid=${req.user.uid}`);
    return this.ordersService.createOrder({ ...dto, userId: req.user.uid });
  }

  // Create Stripe PaymentIntent (client posts MINOR amount)
  @Post('create-payment-intent')
  @Roles('user', 'admin', 'superadmin')
  async createPaymentIntent(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      amount: number; // MINOR units
      currency?: string; // e.g. 'ILS'
      cart?: any[]; // raw cart (for metadata/signature)
      shipping?: number; // MAJOR (optional, tracked in metadata only)
      taxRate?: number; // fraction (e.g. 0.17)
      discount?: number; // MINOR (optional)
    },
  ) {
    const currency = (body.currency ?? 'ILS').toUpperCase();

    // Ensure the amount is valid and satisfies per-currency minima (e.g. ILS ≥ 200 agorot)
    const minorRaw = Math.max(0, Math.round(Number(body.amount) || 0));
    const amountMinor = clampMinorForCurrency(minorRaw, currency);

    // Convert to MAJOR for the service (Stripe PI creation)
    const totalMajor = minorToMajor(amountMinor, currency);

    // Small stable cart signature for idempotency & caching
    const sig = cartSignature(body.cart);
    const idempotencyKey = composePIIdempotencyKey({
      uid: req.user.uid,
      currency,
      amountMinor,
      cartSig: sig,
    });

    this.logger.log(
      `POST /orders/create-payment-intent uid=${req.user.uid} currency=${currency} minor=${amountMinor} cart=${body.cart?.length ?? 0}`,
    );

    return this.ordersService.createPaymentIntent({
      totalMajor,
      currency,
      userId: req.user.uid,
      idempotencyKey,
      cart: body.cart ?? [],
      metadata: {
        shippingMajor: body.shipping ?? 0,
        taxRate: body.taxRate ?? 0,
        discountMinor: body.discount ?? 0,
      },
    });
  }

  // SPA finalize (webhook remains source of truth)
  @Post('confirm')
  @Roles('user', 'admin', 'superadmin')
  async confirm(
    @Req() req: AuthedRequest,
    @Body() body: { paymentIntentId?: string },
  ) {
    const paymentIntentId = (body?.paymentIntentId || '').trim();
    if (!isValidPaymentIntentId(paymentIntentId)) {
      throw new BadRequestException('Valid paymentIntentId is required');
    }
    this.logger.log(
      `POST /orders/confirm uid=${req.user.uid} pi=${paymentIntentId}`,
    );
    return this.ordersService.createOrderFromIntentById(
      paymentIntentId,
      req.user.uid,
    );
  }

  // Legacy helper
  @Post('create-from-intent/:id')
  @Roles('user', 'admin', 'superadmin')
  async createFromIntent(@Req() req: AuthedRequest, @Param('id') id: string) {
    const pi = (id || '').trim();
    if (!isValidPaymentIntentId(pi)) {
      throw new BadRequestException('Valid payment intent id is required');
    }
    this.logger.warn(
      `POST /orders/create-from-intent/${pi} (legacy) uid=${req.user.uid}`,
    );
    return this.ordersService.createOrderFromIntentById(pi, req.user.uid);
  }

  /**
   * 🔔 Stripe webhook — must be PUBLIC and receive RAW body (Buffer).
   * Your main.ts already mounts bodyParser.raw() on this route.
   */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /orders/webhook (Stripe)');
    const raw = getStripeRawBody(req);

    if (!raw || !signature) {
      throw new BadRequestException(
        'Missing raw body or stripe-signature header',
      );
    }

    await this.ordersService.handleStripeWebhook(raw, signature);
    return { received: true };
  }

  @Get('debug/ping')
  @Roles('user', 'admin', 'superadmin')
  debugPing() {
    this.logger.log('GET /orders/debug/ping');
    return { ok: true, ts: new Date().toISOString() };
  }
}
