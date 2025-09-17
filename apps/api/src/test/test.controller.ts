import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { getFirestore } from 'firebase-admin/firestore';

type SeedOrderDto = {
  id: string;
  email?: string;
  amount?: number; // in minor units (agorot)
  currency?: string; // 'ils' by default
};

@Public()
@Controller('test')
export class TestController {
  @Post('seed-order')
  async seedOrder(@Body() dto: SeedOrderDto) {
    const id = dto.id;
    const email = dto.email ?? 'e2e@example.com';
    const amount = dto.amount ?? 1990;
    const currency = (dto.currency ?? 'ils').toLowerCase();

    const now = new Date().toISOString();
    const doc = {
      id,
      userId: 'e2e',
      items: [],
      status: 'pending',
      payment: { method: 'stripe', status: 'requires_payment_method' },
      shippingAddress: null,
      notes: 'seeded-for-e2e',
      createdAt: now,
      updatedAt: now,
      total: amount,
      currency,
      email,
      statusHistory: [{ status: 'pending', timestamp: now, changedBy: 'e2e' }],
    };

    const db = getFirestore();
    await db.collection('orders').doc(id).set(doc, { merge: true });
    return { ok: true, id };
  }
}
