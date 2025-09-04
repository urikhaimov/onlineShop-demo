import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  Param,
  Headers,
  Logger,
  BadRequestException,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Public } from '../auth/public.decorator';

type AuthedUser = { uid: string; role?: string };
type AuthedRequest = Request & { user: AuthedUser };

interface RawBodyRequest extends Request {
  rawBody?: Buffer; // may be set by bodyParser.raw or Nest rawBody:true
}

const MIN_MINOR_ILS = 200; // ₪2.00

@Controller('orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);
  constructor(private readonly ordersService: OrdersService) {}

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

  // ✅ Public polling by Stripe PaymentIntent id (what the client is calling)
  // Final path: /api/orders/public/:piId
  @Public()
  @Get('public/:piId')
  getPublicByPaymentIntent(@Param('piId') piId: string) {
    this.logger.log(`GET /orders/public/${piId}`);
    return this.ordersService.getPublicStatusByPaymentIntent(piId);
  }

  // (Optional) Public minimal read by ORDER id (useful after you already know orderId)
  // Final path: /api/orders/public/order/:id
  @Public()
  @Get('public/order/:id')
  async getOrderPublicById(@Param('id') id: string) {
    const safeId = (id || '').trim();
    const doc = await this.ordersService.getOrderDoc(safeId);
    if (!doc) throw new NotFoundException('Order not found');
    return {
      id: safeId,
      status: doc.status,
      amount: doc.payment?.amount ?? doc.totalAmount,
      currency: doc.payment?.currency,
      updatedAt: doc.updatedAt,
    };
  }

  @Post()
  @Roles('user', 'admin', 'superadmin')
  async createOrder(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    this.logger.log(`POST /orders uid=${req.user.uid}`);
    const completeDto = { ...dto, userId: req.user.uid };
    return this.ordersService.createOrder(completeDto);
  }

  @Post('create-payment-intent')
  @Roles('user', 'admin', 'superadmin')
  async createPaymentIntent(
    @Req() req: AuthedRequest,
    @Body() body: CreatePaymentIntentDto,
  ) {
    const {
      amount, // MINOR units from client (e.g., agorot)
      currency, // NEW: required to avoid undefined in service
      ownerName,
      passportId,
      cart,
      shipping,
      taxRate,
      discount,
      shippingAddress,
    } = body as CreatePaymentIntentDto & { currency?: string };

    const cur = (currency ?? 'ILS').toUpperCase();

    // Clamp only for ILS
    const clientMinor = Math.max(0, Math.round(Number(amount) || 0));
    const safeClientMinor =
      cur === 'ILS' && clientMinor < MIN_MINOR_ILS
        ? MIN_MINOR_ILS
        : clientMinor;

    if (safeClientMinor !== amount) {
      this.logger.warn(
        `Bumped client amount from ${amount} → ${safeClientMinor} (minor ${cur}).`,
      );
    }

    this.logger.log(
      `POST /orders/create-payment-intent uid=${req.user.uid} currency=${cur} minor=${safeClientMinor} cart=${cart?.length ?? 0}`,
    );

    const ZERO_DEC = new Set([
      'BIF',
      'CLP',
      'DJF',
      'GNF',
      'JPY',
      'KMF',
      'KRW',
      'MGA',
      'PYG',
      'RWF',
      'UGX',
      'VND',
      'VUV',
      'XAF',
      'XOF',
      'XPF',
    ]);
    const isZeroDec = ZERO_DEC.has(cur);
    const totalMajor = isZeroDec ? safeClientMinor : safeClientMinor / 100; // convert MINOR → MAJOR

    return this.ordersService.createPaymentIntent({
      totalMajor, // MAJOR units expected by the service
      currency: cur, // e.g. 'ILS'
      userId: req.user.uid,
      // email: optional
      // idempotencyKey: optional (recommended if you want)
      metadata: {
        uid: req.user.uid, // REQUIRED: your webhook expects metadata.uid
        ownerName: ownerName ?? '',
        passportId: passportId ?? '',
        shipping: String(shipping ?? 0),
        taxRate: String(taxRate ?? 0),
        discount: String(discount ?? 0),
        shippingAddress: JSON.stringify(shippingAddress ?? {}),
        items: JSON.stringify(cart ?? []),
      },
    });
  }

  /**
   * Optional SPA finalize endpoint; webhook is still source of truth.
   */
  @Post('confirm')
  @Roles('user', 'admin', 'superadmin')
  async confirm(
    @Req() req: AuthedRequest,
    @Body() body: { paymentIntentId?: string },
  ) {
    const paymentIntentId = (body?.paymentIntentId || '').trim();
    if (!paymentIntentId) {
      throw new BadRequestException('paymentIntentId is required');
    }
    this.logger.log(
      `POST /orders/confirm uid=${req.user.uid} pi=${paymentIntentId}`,
    );
    return this.ordersService.createOrderFromIntentById(
      paymentIntentId,
      req.user.uid,
    );
  }

  @Post('create-from-intent/:id')
  @Roles('user', 'admin', 'superadmin')
  async createFromIntent(@Req() req: AuthedRequest, @Param('id') id: string) {
    const pi = (id || '').trim();
    if (!pi) throw new BadRequestException('PaymentIntent id is required');
    this.logger.warn(
      `POST /orders/create-from-intent/${pi} (legacy) uid=${req.user.uid}`,
    );
    return this.ordersService.createOrderFromIntentById(pi, req.user.uid);
  }

  /**
   * 🔔 Stripe webhook — must be PUBLIC and receive RAW body.
   * Ensure main.ts has the bodyParser.raw() on this path.
   */
  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /orders/webhook (Stripe)');
    const raw =
      req.rawBody ??
      (Buffer.isBuffer((req as any).body)
        ? ((req as any).body as Buffer)
        : undefined);
    await this.ordersService.handleStripeWebhook(raw as Buffer, signature);
    return { received: true };
  }

  @Get('debug/ping')
  @Roles('user', 'admin', 'superadmin')
  debugPing() {
    this.logger.log('GET /orders/debug/ping');
    return { ok: true, ts: new Date().toISOString() };
  }
}
