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
  HttpCode,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';

import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

import { OrdersService } from './orders.service';

import { minorToMajor } from './utils/currency.util';
import { clampMinorForCurrency } from './utils/payment.util';
import { cartSignature } from './utils/cart.util';
import {
  isValidPayPalOrderId,
  composeOrderRequestId,
} from './utils/paypal.util';

import { UpdateOrderDto } from './dto/update-order.dto';

type AuthedUser = { uid: string; role?: string; email?: string };
type AuthedRequest = Request & { user: AuthedUser };

@Controller('orders')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(
    @Inject(OrdersService)
    private readonly ordersService: OrdersService,
  ) {}

  // ── Reads ───────────────────────────────────────────────────────────────────

  @Get('mine')
  @Roles('user', 'admin', 'superadmin')
  getMyOrders(@Req() req: AuthedRequest) {
    return this.ordersService.getOrdersByUserId(req.user.uid);
  }

  @Get()
  @Roles('admin', 'superadmin')
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @Roles('user', 'admin', 'superadmin')
  getOrderById(@Req() req: AuthedRequest, @Param('id') id: string) {
    const orderId = (id || '').trim();
    return this.ordersService.getOrderById(
      req.user.uid,
      orderId,
      req.user.role || 'user',
    );
  }

  /** Public polling by PayPal order ID */
  @Public()
  @Get('public/:orderId')
  getPublicByOrderId(@Param('orderId') orderId: string) {
    const safe = (orderId || '').trim();
    if (!isValidPayPalOrderId(safe)) {
      throw new BadRequestException('Invalid order id');
    }
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
  createOrder(@Req() req: AuthedRequest, @Body() dto: any) {
    return this.ordersService.createOrder({ ...dto, userId: req.user.uid });
  }

  /** Create a PayPal order and return the PayPal orderId for the frontend. */
  @Post('create-paypal-order')
  @Roles('user', 'admin', 'superadmin')
  async createPayPalOrder(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      amount: number; // MINOR
      currency?: string;
      cart?: any[];
      shipping?: number; // MAJOR
      taxRate?: number; // fraction (e.g. 0.17)
      discount?: number; // MINOR
      orderId?: string | null;
      email?: string | null;
      nonce?: string | null;
    },
  ) {
    const currencyUpper = (body.currency ?? 'ILS').toUpperCase();
    const minorRaw = Math.max(0, Math.round(Number(body.amount) || 0));
    const amountMinor = clampMinorForCurrency(minorRaw, currencyUpper);
    const totalMajor = minorToMajor(amountMinor, currencyUpper);

    const sig = cartSignature(body.cart ?? []);
    const shipMinor = Math.max(
      0,
      Math.round(((body.shipping ?? 0) as number) * 100),
    );
    const taxBps = Math.round(((body.taxRate ?? 0) as number) * 10_000);
    const discountMinor = Math.max(0, Math.round(Number(body.discount) || 0));

    const requestId = `${composeOrderRequestId({
      uid: req.user.uid,
      currency: currencyUpper,
      amountMinor,
      cartSig: sig,
    })}::s${shipMinor}-t${taxBps}-d${discountMinor}${
      body.nonce ? `-n${body.nonce}` : ''
    }`.slice(0, 255);

    this.logger.log(
      `POST /orders/create-paypal-order uid=${req.user.uid} currency=${currencyUpper} minor=${amountMinor}`,
    );

    return this.ordersService.createPayPalOrder({
      totalMajor,
      currency: currencyUpper.toLowerCase(),
      userId: req.user.uid,
      email: body.email ?? undefined,
      requestId,
      cart: body.cart ?? [],
      orderId: body.orderId ?? undefined,
    });
  }

  /** Save draft items/customer/shipping against a PayPal order ID. */
  @Post('save-draft')
  @Roles('user', 'admin', 'superadmin')
  async saveDraft(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      paypalOrderId: string;
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
    },
  ) {
    const paypalOrderId = (body?.paypalOrderId || '').trim();
    if (!isValidPayPalOrderId(paypalOrderId)) {
      throw new BadRequestException('Valid paypalOrderId is required');
    }
    return this.ordersService.saveDraftCheckoutDetails({
      paypalOrderId,
      userId: req.user.uid,
      items: body.items,
      customer: body.customer,
      shippingAddress: body.shippingAddress,
    });
  }

  /** Capture an approved PayPal order and create the Firestore order record. */
  @Post('capture-paypal-order')
  @Roles('user', 'admin', 'superadmin')
  async capturePayPalOrder(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      orderId: string;
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
    },
  ) {
    const orderId = (body?.orderId || '').trim();
    if (!isValidPayPalOrderId(orderId)) {
      throw new BadRequestException('Valid PayPal orderId is required');
    }
    this.logger.log(
      `POST /orders/capture-paypal-order uid=${req.user.uid} orderId=${orderId}`,
    );
    return this.ordersService.capturePayPalOrder({
      orderId,
      userId: req.user.uid,
      customer: body.customer,
      shippingAddress: body.shippingAddress,
    });
  }

  @Patch(':id')
  @Roles('admin', 'superadmin')
  async updateOrder(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    const safeId = (id || '').trim();
    this.logger.log(
      `PATCH /orders/${safeId} by=${req.user.uid} body=${JSON.stringify(dto)}`,
    );

    const patch: any = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.notes !== undefined) patch.notes = dto.notes;
    if (dto.delivery !== undefined) patch.delivery = dto.delivery;

    const updated = await this.ordersService.updateOrder(
      safeId,
      patch,
      req.user.uid,
    );

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

  @Get('debug/ping')
  @Roles('user', 'admin', 'superadmin')
  debugPing() {
    return { ok: true, ts: new Date().toISOString() };
  }
}
