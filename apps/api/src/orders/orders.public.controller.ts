import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { OrdersService } from './orders.service';
import { adminDb } from '@common/firebase';

@Controller('orders/public') // -> /api/orders/public/*
export class OrdersPublicController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Get('order/:id')
  async getPublicOrder(@Param('id') id: string) {
    const snap = await adminDb.collection('orders').doc(id).get();
    if (!snap.exists) throw new NotFoundException('Order not found');
    const o = snap.data() as any;

    const toIso = (v: any) =>
      v?.toDate
        ? v.toDate().toISOString()
        : v instanceof Date
          ? v.toISOString()
          : null;

    const amountCents =
      typeof o?.amount === 'number'
        ? Math.round(o.amount)
        : typeof o?.total === 'number'
          ? Math.round(o.total * 100)
          : 0;

    return {
      id,
      status: o?.status ?? null,
      amount: amountCents,
      currency: o?.currency ?? null,

      refundedAmount:
        typeof o?.refundedAmount === 'number' ? o.refundedAmount : 0,
      refundIds: Array.isArray(o?.refundIds) ? o.refundIds : [],

      paymentIntentId: o?.paymentIntentId ?? null,
      email: o?.email ?? o?.buyer?.email ?? null,

      invoice: o?.invoice ?? null, // { path, url, createdAt } or null

      createdAt: toIso(o?.createdAt),
      updatedAt: toIso(o?.updatedAt),
    };
  }

  // Keep AFTER the specific route above so it doesn’t swallow /order/:id
  @Public()
  @Get(':piId')
  getByPaymentIntent(@Param('piId') piId: string) {
    return this.ordersService.getPublicStatusByPaymentIntent(piId);
  }
}
