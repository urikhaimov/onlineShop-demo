// src/orders/orders.controller.ts
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

interface RawBodyRequest extends Request {
  rawBody: Buffer;
}

type AuthedRequest = Request & { user: { uid: string; role?: string } };

const MIN_MINOR_ILS = 200; // ₪2.00

@Controller('orders')
@UseGuards(FirebaseAuthGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Get('mine')
  getMyOrders(@Req() req: AuthedRequest) {
    return this.ordersService.getOrdersByUserId(req.user.uid);
  }

  @Get()
  @Roles('admin', 'superadmin')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('user', 'admin', 'superadmin')
  getOrderById(@Req() req: AuthedRequest, @Param('id') id: string) {
    return this.ordersService.getOrderById(
      req.user.uid,
      id,
      req.user.role || 'user',
    );
  }

  @Post()
  async createOrder(@Req() req: AuthedRequest, @Body() dto: CreateOrderDto) {
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

    // Log everything we got
    this.logger.log(
      `Controller PI in: clientMinor=${amount}, cart=${cart?.length ?? 0}, shippingMajor=${shipping}, taxRate=${taxRate}, discountMinor=${discount}, uid=${req.user.uid}`,
    );

    // Hard clamp at controller (extra safety)
    const safeClientMinor =
      Math.max(0, Math.round(Number(amount) || 0)) < MIN_MINOR_ILS
        ? MIN_MINOR_ILS
        : Math.max(0, Math.round(Number(amount) || 0));

    if (safeClientMinor !== amount) {
      this.logger.warn(
        `Controller bumped client amount from ${amount} to minimum ${safeClientMinor} (minor ILS).`,
      );
    }

    // Forward to service (which also recomputes + enforces minimum)
    return this.ordersService.createPaymentIntent(
      safeClientMinor,
      ownerName,
      passportId,
      req.user.uid,
      cart,
      shipping, // major units
      taxRate, // e.g., 0.17
      discount, // minor units
      shippingAddress, // optional
    );
  }

  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.ordersService.handleStripeWebhook(req.rawBody, signature);
  }
}
