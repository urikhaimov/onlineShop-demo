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
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);
  constructor(private readonly ordersService: OrdersService) {}

  @Get('mine')
  getMyOrders(@Req() req: AuthedRequest) {
    this.logger.log(`GET /orders/mine by uid=${req.user.uid}`);
    return this.ordersService.getOrdersByUserId(req.user.uid);
  }

  @Get()
  @Roles('admin', 'superadmin')
  getAllOrders() {
    this.logger.log('GET /orders');
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('user', 'admin', 'superadmin')
  getOrderById(@Req() req: AuthedRequest, @Param('id') id: string) {
    this.logger.log(`GET /orders/${id} by uid=${req.user.uid}`);
    return this.ordersService.getOrderById(
      req.user.uid,
      id,
      req.user.role || 'user',
    );
  }

  @Post()
  async createOrder(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
    this.logger.log(`POST /orders by uid=${req.user.uid}`);
    const completeDto = { ...dto, userId: req.user.uid };
    return this.ordersService.createOrder(completeDto);
  }

  @Post('create-payment-intent')
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

    const safeClientMinor =
      Math.max(0, Math.round(Number(amount) || 0)) < MIN_MINOR_ILS
        ? MIN_MINOR_ILS
        : Math.max(0, Math.round(Number(amount) || 0));

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

  // Fallback finalize endpoint if webhooks don’t hit locally
  @Post('create-from-intent/:id')
  async createFromIntent(@Req() req: AuthedRequest, @Param('id') id: string) {
    this.logger.log(
      `POST /orders/create-from-intent/${id} by uid=${req.user.uid}`,
    );
    return this.ordersService.createOrderFromIntentById(id, req.user.uid);
  }

  // Stripe webhook — requires rawBody: true in main.ts
  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    this.logger.log('POST /orders/webhook (Stripe)');
    return this.ordersService.handleStripeWebhook(req.rawBody, signature);
  }

  // Simple liveness check
  @Get('debug/ping')
  debugPing() {
    this.logger.log('GET /orders/debug/ping');
    return { ok: true, ts: new Date().toISOString() };
  }
}
