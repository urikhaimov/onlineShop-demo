// apps/api/src/orders/orders.controller.ts
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
} from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

type AuthedRequest = Request & { user: { uid: string; role?: string } };
interface RawBodyRequest extends Request {
  rawBody: Buffer;
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
    this.logger.log(`GET /orders/${id} uid=${req.user.uid}`);
    return this.ordersService.getOrderById(
      req.user.uid,
      id,
      req.user.role || 'user',
    );
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
      amount,
      ownerName,
      passportId,
      cart,
      shipping,
      taxRate,
      discount,
      shippingAddress,
    } = body;

    this.logger.log(
      `POST /orders/create-payment-intent uid=${req.user.uid} minor=${amount} cart=${cart?.length ?? 0}`,
    );

    const clientMinor = Math.max(0, Math.round(Number(amount) || 0));
    const safeClientMinor =
      clientMinor < MIN_MINOR_ILS ? MIN_MINOR_ILS : clientMinor;

    if (safeClientMinor !== amount) {
      this.logger.warn(
        `Bumped client amount from ${amount} → ${safeClientMinor} (minor ILS).`,
      );
    }

    return this.ordersService.createPaymentIntent(
      safeClientMinor,
      ownerName,
      passportId,
      req.user.uid,
      cart,
      shipping,
      taxRate,
      discount,
      shippingAddress,
    );
  }

  /**
   * ✅ Primary finalize endpoint for the Success page.
   * Expects body: { paymentIntentId: string }
   * Idempotent on the service side (doc id = PI id).
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

  /**
   * Legacy/manual finalize route (kept for convenience).
   * Prefer POST /orders/confirm with body.
   */
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
   * Stripe webhook — must receive raw body.
   * NOTE: If FirebaseAuthGuard is global or at controller level (like here),
   * you should EXEMPT this route from auth (e.g., with a custom @Public() decorator
   * handled by a global guard) or move it to a separate controller without auth.
   */
  @Post('webhook')
  // @Public() // <-- implement a decorator or move to an unauthenticated controller
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /orders/webhook (Stripe)');
    return this.ordersService.handleStripeWebhook(req.rawBody, signature);
  }

  // Simple liveness check
  @Get('debug/ping')
  @Roles('user', 'admin', 'superadmin')
  debugPing() {
    this.logger.log('GET /orders/debug/ping');
    return { ok: true, ts: new Date().toISOString() };
  }
}
