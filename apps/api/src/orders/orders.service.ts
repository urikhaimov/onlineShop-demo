import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

import { adminDb } from '@common/firebase';
import { CDefaultCurrency } from '@common/types';
import { CreateOrderDto } from './dto/create-order.dto';

type PlainItem = {
  productId: string;
  name: string;
  price: number; // MAJOR units (e.g., ₪)
  image?: string | null;
  quantity: number;
};

@Injectable()
export class OrdersService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY in environment');
    this.stripe = new Stripe(secretKey);
  }

  // ---------------- helpers ----------------
  private nowTs() {
    return admin.firestore.Timestamp.now();
  }

  private numericUid(uid: string): number {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private toPlainItems(items: CreateOrderDto['items']): PlainItem[] {
    return (items || []).map((it) => ({
      productId: String((it as any).productId ?? ''),
      name: String((it as any).name ?? ''),
      price: Number((it as any).price ?? 0),
      image:
        typeof (it as any).image === 'string'
          ? (it as any).image
          : ((it as any).image ?? null),
      quantity: Number((it as any).quantity ?? 0),
    }));
  }

  private toPlainPayment(
    p:
      | {
          method?: string;
          status?: 'paid' | 'unpaid' | string;
          transactionId?: string | null;
        }
      | undefined,
  ) {
    if (!p) {
      return {
        method: 'manual',
        status: 'paid' as const,
        transactionId: `manual-${Date.now()}`,
      };
    }
    const status = (p.status === 'paid' ? 'paid' : 'unpaid') as
      | 'paid'
      | 'unpaid';
    return {
      method: String(p.method ?? 'card'),
      status,
      transactionId: p.transactionId ?? null,
    };
  }

  private toPlainAddress(
    a?: {
      fullName?: string;
      phone?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    } | null,
  ) {
    if (!a) return null;
    return {
      fullName: String(a.fullName ?? ''),
      phone: String(a.phone ?? ''),
      street: String(a.street ?? ''),
      city: String(a.city ?? ''),
      postalCode: String(a.postalCode ?? ''),
      country: String(a.country ?? ''),
    };
  }

  private async decrementStock(
    items: Array<{ productId: string; quantity: number }>,
  ) {
    if (!items?.length) return;

    const batch = adminDb.batch();
    let ops = 0;
    const inc = admin.firestore.FieldValue.increment;

    for (const { productId, quantity } of items) {
      try {
        const productRef = adminDb.collection('products').doc(productId);
        const snap = await productRef.get();
        if (!snap.exists) {
          this.logger.warn(
            `Stock decrement skipped (missing product ${productId})`,
          );
          continue;
        }
        batch.update(productRef, { stock: inc(-Math.abs(quantity)) });
        ops++;
      } catch (e) {
        this.logger.error(
          `Error preparing stock decrement for ${productId}`,
          (e as Error)?.stack || String(e),
        );
      }
    }

    if (ops > 0) {
      try {
        await batch.commit();
      } catch (e) {
        this.logger.error(
          `Stock batch commit failed (ops=${ops})`,
          (e as Error)?.stack || String(e),
        );
      }
    }
  }

  private readonly minByCurrencyMinor: Record<string, number> = {
    usd: 50,
    eur: 50,
    gbp: 30,
    ils: 200,
    aud: 50,
    cad: 50,
    chf: 50,
    sek: 50,
    dkk: 50,
    nok: 50,
    jpy: 50,
    huf: 175,
    idr: 10000,
    krw: 500,
    vnd: 12000,
  };

  private normalizeAmountMinor(amountMinor: number, currency: string): number {
    const cur = (currency || 'usd').toLowerCase();
    const inputMinor = Math.max(0, Math.round(Number(amountMinor) || 0));
    const minMinor = this.minByCurrencyMinor[cur] ?? 50;
    if (inputMinor < minMinor) {
      this.logger.warn(
        `Amount too small for ${cur}: ${inputMinor}. Bumping to ${minMinor}.`,
      );
      return minMinor;
    }
    return inputMinor;
  }

  private computeCartTotalMinor(
    cart: PlainItem[],
    shippingMajor: number,
    taxRate: number,
    discountMinor: number,
  ): number {
    const itemsMinor = (cart || []).reduce((sum, i) => {
      const priceMajor = Number(i.price) || 0;
      const qty = Number(i.quantity) || 0;
      return sum + Math.round(priceMajor * 100) * qty;
    }, 0);

    const shippingMinor = Math.round((Number(shippingMajor) || 0) * 100);
    const taxMinor = Math.round(itemsMinor * (Number(taxRate) || 0));
    const discount = Math.max(0, Math.round(Number(discountMinor) || 0));

    return Math.max(0, itemsMinor + shippingMinor + taxMinor - discount);
  }

  // ---------------- mutations ----------------

  async createOrder(dto: CreateOrderDto) {
    try {
      const plainItems = this.toPlainItems(dto.items);
      const plainPayment = this.toPlainPayment(dto.payment);
      const plainAddress = this.toPlainAddress(dto.shippingAddress);

      const now = this.nowTs();
      const uidNum = this.numericUid(dto.userId);

      const orderDoc = {
        userId: String(dto.userId),
        email: dto.email ?? null,
        items: plainItems,
        totalAmount: Math.max(0, Math.round(Number(dto.totalAmount) || 0)), // MINOR
        paymentIntentId: dto.paymentIntentId ?? null,
        payment: plainPayment,
        status: (dto.status as any) ?? ('confirmed' as const),
        ownerName: dto.ownerName ?? null,
        passportId: dto.passportId ?? null,
        shippingAddress: plainAddress,
        notes: dto.notes ?? null,
        statusHistory: [
          {
            status: (dto.status as any) ?? 'confirmed',
            timestamp: new Date().toISOString(),
            changedBy: 'user',
          },
        ],
        createdAt: now,
        updatedAt: now,
        metadata: {
          createdBy: { uid: uidNum, name: dto.email ?? '' },
          updatedBy: { uid: uidNum, name: dto.email ?? '' },
          createdAt: now,
          updatedAt: now,
        },
      };

      const ref = adminDb.collection('orders').doc();
      await ref.set({ id: ref.id, ...orderDoc });

      await this.decrementStock(
        plainItems.map(({ productId, quantity }) => ({ productId, quantity })),
      );

      this.logger.log(`Order created (manual): ${ref.id}`);
      return { id: ref.id, ...orderDoc };
    } catch (e) {
      this.logger.error('createOrder failed', (e as Error)?.stack || String(e));
      throw new InternalServerErrorException('Failed to create order');
    }
  }

  async createPaymentIntent(
    amountMinorFromClient: number,
    ownerName: string,
    passportId: string,
    uid: string,
    cart: PlainItem[],
    shippingMajor: number,
    taxRate: number,
    discountMinor: number,
    shippingAddress?: {
      fullName: string;
      phone: string;
      street: string;
      city: string;
      postalCode: string;
      country: string;
    },
  ) {
    const currency = (CDefaultCurrency || 'ILS').toLowerCase();

    this.logger.log(
      `PI request: currency=${currency}, clientMinor=${amountMinorFromClient}, cart=${cart?.length ?? 0}, shipMaj=${shippingMajor}, tax=${taxRate}, discMinor=${discountMinor}, uid=${uid}`,
    );

    const serverMinor = this.computeCartTotalMinor(
      cart || [],
      shippingMajor,
      taxRate,
      discountMinor,
    );

    const chosenMinor = serverMinor > 0 ? serverMinor : amountMinorFromClient;
    const normalizedMinor = this.normalizeAmountMinor(chosenMinor, currency);

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: normalizedMinor,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          uid,
          ownerName,
          passportId,
          currency,
          serverMinor: String(serverMinor),
          clientMinor: String(amountMinorFromClient),
          chosenMinor: String(chosenMinor),
          normalizedMinor: String(normalizedMinor),
          shippingMajor: String(shippingMajor),
          taxRate: String(taxRate),
          discountMinor: String(discountMinor),
          items: JSON.stringify(
            (cart || []).map((i) => ({
              productId: i.productId,
              name: i.name,
              priceMajor: i.price,
              quantity: i.quantity,
              image: i.image ?? null,
            })),
          ),
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : '',
        },
      });

      this.logger.log(
        `Created PaymentIntent ${paymentIntent.id} amount=${paymentIntent.amount} ${currency}`,
      );

      return { clientSecret: paymentIntent.client_secret };
    } catch (e) {
      this.logger.error(
        'Stripe PI creation failed',
        (e as Error)?.stack || String(e),
      );
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  /** Called by webhook */
  private async createOrderFromIntent(intent: Stripe.PaymentIntent) {
    const uid = intent.metadata?.uid;
    if (!uid) throw new Error('Missing uid in Stripe metadata');

    let items: PlainItem[] = [];
    try {
      const raw = intent.metadata?.items || '[]';
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('items not array');
      items = parsed.map((i: any) => ({
        productId: String(i.productId ?? ''),
        name: String(i.name ?? ''),
        price: Number(i.priceMajor ?? i.price ?? 0),
        image: typeof i.image === 'string' ? i.image : null,
        quantity: Number(i.quantity ?? 0),
      }));
    } catch {
      this.logger.warn('Invalid items metadata in PaymentIntent');
    }

    let shippingAddress: {
      fullName: string;
      phone: string;
      street: string;
      city: string;
      postalCode: string;
      country: string;
    } | null = null;

    if (intent.metadata?.shippingAddress) {
      try {
        shippingAddress = JSON.parse(intent.metadata.shippingAddress);
      } catch {
        shippingAddress = null;
      }
    }
    if (!shippingAddress && intent.shipping) {
      shippingAddress = {
        fullName: intent.shipping.name ?? '',
        phone: intent.shipping.phone ?? '',
        street: intent.shipping.address?.line1 ?? '',
        city: intent.shipping.address?.city ?? '',
        postalCode: intent.shipping.address?.postal_code ?? '',
        country: intent.shipping.address?.country ?? '',
      };
    }

    const now = this.nowTs();
    const uidNum = this.numericUid(uid);

    const orderDoc = {
      userId: uid,
      email: null as string | null,
      items,
      totalAmount: intent.amount, // MINOR
      paymentIntentId: intent.id,
      payment: {
        method: 'card' as const,
        status: 'paid' as const,
        transactionId: intent.id,
      },
      status: 'confirmed' as const,
      ownerName: intent.metadata?.ownerName ?? null,
      passportId: intent.metadata?.passportId ?? null,
      shippingAddress,
      statusHistory: [
        {
          status: 'confirmed',
          timestamp: new Date().toISOString(),
          changedBy: 'system',
        },
      ],
      createdAt: now,
      updatedAt: now,
      metadata: {
        createdBy: { uid: uidNum, name: '' },
        updatedBy: { uid: uidNum, name: '' },
        createdAt: now,
        updatedAt: now,
      },
    };

    const ref = adminDb.collection('orders').doc();
    await ref.set({ id: ref.id, ...orderDoc });

    await this.decrementStock(
      items.map(({ productId, quantity }) => ({ productId, quantity })),
    );

    this.logger.log(`Order created from Stripe intent: ${ref.id}`);
    return { id: ref.id, ...orderDoc };
  }

  /** ✅ Called by the controller when webhooks can’t reach your server */
  async createOrderFromIntentById(intentId: string, expectedUid?: string) {
    try {
      const pi = await this.stripe.paymentIntents.retrieve(intentId);
      if (pi.status !== 'succeeded') {
        throw new Error(
          `PaymentIntent ${intentId} is not succeeded (status=${pi.status})`,
        );
      }
      if (expectedUid && pi.metadata?.uid && pi.metadata.uid !== expectedUid) {
        this.logger.warn(
          `UID mismatch for PI ${intentId}: expected=${expectedUid} meta=${pi.metadata.uid}`,
        );
      }
      return this.createOrderFromIntent(pi as Stripe.PaymentIntent);
    } catch (e) {
      this.logger.error(
        `createOrderFromIntentById failed for ${intentId}`,
        (e as Error)?.stack || String(e),
      );
      throw new InternalServerErrorException(
        'Failed to finalize order from PaymentIntent',
      );
    }
  }

  // ---------------- webhook ----------------
  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    try {
      const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.createOrderFromIntent(intent);
      }

      return { received: true };
    } catch (err) {
      this.logger.error('Stripe webhook error', err as Error);
      throw new InternalServerErrorException('Webhook handling failed');
    }
  }

  // ---------------- queries ----------------
  async getOrdersByUserId(uid: string) {
    const snapshot = await adminDb
      .collection('orders')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async getOrderById(uid: string, id: string, role: string) {
    const snap = await adminDb.collection('orders').doc(id).get();
    const data = snap.data();
    if (!snap.exists || !data) throw new NotFoundException('Order not found');
    if (role === 'admin' || role === 'superadmin' || data.userId === uid) {
      return { id: snap.id, ...data };
    }
    throw new NotFoundException('Unauthorized');
  }

  async getAllOrders() {
    const snapshot = await adminDb
      .collection('orders')
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}
