import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
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

// ── utils ─────────────────────────────────────────────────────────────────────
import { minorToMajor } from './utils/currency.util';
import { clampMinorForCurrency } from './utils/payment.util';
import { cartSignature } from './utils/cart.util';
import {
  isValidPaymentIntentId,
  composePIIdempotencyKey,
} from './utils/stripe.util';
import { getStripeRawBody } from './utils/request.util';

type AuthedUser = { uid: string; role?: string };
type AuthedRequest = Request & { user: AuthedUser };
interface RawBodyRequest extends Request {
  rawBody?: Buffer;
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

  // Public polling by PaymentIntent id
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

  @Public()
  @Get('public/order/:id')
  async getOrderPublicById(@Param('id') id: string) {
    const safeId = (id || '').trim();
    const doc = await this.ordersService.getOrderDoc(safeId);
    if (!doc) throw new NotFoundException('Order not found');
    return {
      id: safeId,
      status: doc.status,
      amount: doc.total ?? doc.totalAmount,
      currency: doc.currency ?? doc.payment?.currency,
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

  // Client -> create PaymentIntent
  @Post('create-payment-intent')
  @Roles('user', 'admin', 'superadmin')
  async createPaymentIntent(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      amount: number; // MINOR
      currency?: string; // 'ILS'
      cart?: any[];
      shipping?: number; // MAJOR
      taxRate?: number; // fraction (0.17)
      discount?: number; // MINOR
      // optional linkage (helps webhook):
      orderId?: string | null;
      // customer fields (optional)
      ownerName?: string | null;
      passportId?: string | null;
      email?: string | null;
      phone?: string | null;
      shippingAddress?: Record<string, any> | null;
      metadata?: Record<string, any>;
    },
  ) {
    const currency = (body.currency ?? 'ILS').toUpperCase();
    const minorRaw = Math.max(0, Math.round(Number(body.amount) || 0));
    const amountMinor = clampMinorForCurrency(minorRaw, currency);
    const totalMajor = minorToMajor(amountMinor, currency);

    // Cart signature participates in (client-visible) key
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
      email: body.email ?? undefined,
      idempotencyKey, // service may recompute/augment internally
      cart: body.cart ?? [],
      orderId:
        (body.orderId ?? undefined) ||
        (body.metadata?.orderId as string | undefined),
      metadata: {
        // Stripe metadata MUST be strings:
        shippingMajor: String(body.shipping ?? 0),
        taxRate: String(body.taxRate ?? 0),
        discountMinor: String(body.discount ?? 0),
        ownerName: body.ownerName ?? undefined,
        passportId: body.passportId ?? undefined,
        phone: body.phone ?? undefined,
        ...(body.metadata ?? {}),
      },
    } as any);
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

  // PATCH (used by Admin Edit page)
  @Patch(':id')
  @Roles('admin', 'superadmin')
  async updateOrder(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      status: string;
      notes: string | null;
      delivery: { provider?: string; trackingNumber?: string; eta?: string };
    }>,
  ) {
    const safeId = (id || '').trim();
    this.logger.log(`PATCH /orders/${safeId} by=${req.user.uid}`);
    return this.ordersService.updateOrder(safeId, dto, req.user.uid);
  }

  /**
   * 🔔 Stripe webhook — must be PUBLIC and receive RAW body (Buffer).
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
