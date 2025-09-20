// src/orders/orders.controller.ts
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

// ✅ DTO for PATCH validation
import { UpdateOrderDto } from './dto/update-order.dto';

type AuthedUser = { uid: string; role?: string; email?: string };
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
      cart?: any[]; // accepts the richer cart you send from the client
      shipping?: number; // MAJOR
      taxRate?: number; // fraction (e.g., 0.17)
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
      // optional client-provided idempotency key (safe to pass through)
      idempotencyKey?: string | null;
    },
  ) {
    const currencyUpper = (body.currency ?? 'ILS').toUpperCase();
    const minorRaw = Math.max(0, Math.round(Number(body.amount) || 0));
    const amountMinor = clampMinorForCurrency(minorRaw, currencyUpper);
    const totalMajor = minorToMajor(amountMinor, currencyUpper);

    // Cart signature participates in (client-visible) key
    const sig = cartSignature(body.cart ?? []);

    // Normalize extras that can change while amount/cart stay same — include
    // them in the key so Stripe doesn't raise `idempotency_error`.
    const shipMinor = Math.max(
      0,
      Math.round(((body.shipping ?? 0) as number) * 100),
    );
    const taxBps = Math.round(((body.taxRate ?? 0) as number) * 10_000); // 0.17 -> 1700 bps
    const discountMinor = Math.max(0, Math.round(Number(body.discount) || 0));

    // Prefer caller key if given, otherwise compose a stable key with extras.
    // Example: pi-ILS-299-<sig>::s599-t1700-d300
    const composedKey = `${composePIIdempotencyKey({
      uid: req.user.uid,
      currency: currencyUpper,
      amountMinor,
      cartSig: sig,
    })}::s${shipMinor}-t${taxBps}-d${discountMinor}`;
    const idempotencyKey = (body.idempotencyKey || composedKey).slice(0, 255);

    this.logger.log(
      `POST /orders/create-payment-intent uid=${req.user.uid} currency=${currencyUpper} minor=${amountMinor} cart=${body.cart?.length ?? 0}`,
    );

    return this.ordersService.createPaymentIntent({
      totalMajor,
      currency: currencyUpper.toLowerCase(), // service expects lower-case (e.g., 'ils')
      userId: req.user.uid,
      email: body.email ?? undefined,
      idempotencyKey,
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

  /**
   * Save/merge draft checkout details into the current PI document.
   * Optionally mirrors shipping to Stripe PI (set `mirrorToStripe: true`).
   */
  @Post('save-draft')
  @Roles('user', 'admin', 'superadmin')
  async saveDraft(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      paymentIntentId: string;
      items?: any[];
      customer?: { name?: string; email?: string; phone?: string };
      shippingAddress?: {
        name?: string;
        phone?: string;
        address?: {
          line1?: string;
          city?: string;
          postalCode?: string;
          country?: string;
        };
      };
      mirrorToStripe?: boolean;
    },
  ) {
    const paymentIntentId = (body?.paymentIntentId || '').trim();
    if (!isValidPaymentIntentId(paymentIntentId)) {
      throw new BadRequestException('Valid paymentIntentId is required');
    }
    this.logger.log(
      `POST /orders/save-draft uid=${req.user.uid} pi=${paymentIntentId}`,
    );
    return this.ordersService.saveDraftCheckoutDetails({
      paymentIntentId,
      userId: req.user.uid,
      items: body.items,
      customer: body.customer,
      shippingAddress: body.shippingAddress,
      updateStripePI: !!body.mirrorToStripe,
    });
  }

  /**
   * Server-side confirm (single source of truth).
   * Accepts a PaymentMethod ID and optional customer/shipping data.
   * May return { status: 'requires_action' } if 3DS is needed.
   */
  @Post('confirm')
  @Roles('user', 'admin', 'superadmin')
  async confirm(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      paymentIntentId?: string;
      paymentMethodId?: string;
      customer?: { name?: string; email?: string; phone?: string };
      shippingAddress?: {
        name?: string;
        phone?: string;
        address?: {
          line1?: string;
          city?: string;
          postalCode?: string;
          country?: string;
        };
      };
      mirrorToStripe?: boolean;
      returnUrl?: string;
    },
  ) {
    const paymentIntentId = (body?.paymentIntentId || '').trim();
    if (!isValidPaymentIntentId(paymentIntentId)) {
      throw new BadRequestException('Valid paymentIntentId is required');
    }
    this.logger.log(
      `POST /orders/confirm uid=${req.user.uid} pi=${paymentIntentId}`,
    );
    // delegate to the new flow that handles confirm + cleanup
    return this.ordersService.confirmPaymentIntent({
      paymentIntentId,
      userId: req.user.uid,
      paymentMethodId: body.paymentMethodId,
      customer: body.customer,
      shippingAddress: body.shippingAddress,
      mirrorToStripe: !!body.mirrorToStripe,
      returnUrl: body.returnUrl,
    });
  }

  // PATCH (used by Admin Edit page)
  @Patch(':id')
  @Roles('admin', 'superadmin')
  async updateOrder(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto, // ✅ validate body
  ) {
    const safeId = (id || '').trim();

    // Helpful log to debug any remaining 4xx/5xx responses
    this.logger.log(
      `PATCH /orders/${safeId} by=${req.user.uid} body=${JSON.stringify(dto)}`,
    );

    // Only forward whitelisted keys to the service
    const patch: any = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.delivery !== undefined) patch.delivery = dto.delivery;

    const updated = await this.ordersService.updateOrder(
      safeId,
      patch,
      req.user.uid,
    );

    // Optional hook: if your service implements notifyCustomer, call it safely
    if (dto.notifyCustomer && (this.ordersService as any)?.notifyCustomer) {
      try {
        await (this.ordersService as any).notifyCustomer(
          updated,
          patch,
          req.user,
        );
      } catch (e: any) {
        this.logger.warn(
          `notifyCustomer failed for ${safeId}: ${e?.message || e}`,
        );
      }
    }

    return updated;
  }

  /**
   * 🔔 Stripe webhook — must be PUBLIC and receive RAW body (Buffer).
   */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /orders/webhook (Stripe)');
    const raw = getStripeRawBody(req as any);
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
