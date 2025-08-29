// src/orders/orders.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

import { adminDb } from '@common/firebase';
import { CDefaultCurrency } from '@common/types';
import { CreateOrderDto } from './dto/create-order.dto';

type PlainItem = {
  productId: string;
  name: string;
  price: number; // MAJOR units (e.g., ₪)
  image?: string;
  quantity: number;
};

@Injectable()
export class OrdersService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(OrdersService.name);

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY in environment');
    // Use SDK default API version
    this.stripe = new Stripe(secretKey);
  }

  // ======================== helpers ========================

  private nowTs() {
    return admin.firestore.Timestamp.now();
  }

  private numericUid(uid: string): number {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private toPlainItems(items: CreateOrderDto['items']): PlainItem[] {
    return items.map((it) => ({
      productId: it.productId,
      name: it.name,
      price: it.price,
      image: it.image,
      quantity: it.quantity,
    }));
  }

  private async decrementStock(
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const batch = adminDb.batch();
    for (const { productId, quantity } of items) {
      const ref = adminDb.collection('products').doc(productId);
      batch.update(ref, {
        stock: admin.firestore.FieldValue.increment(-Math.abs(quantity)),
      });
    }
    await batch.commit();
  }

  /** Stripe minimums in MINOR units (cents/agorot). */
  private readonly minByCurrencyMinor: Record<string, number> = {
    usd: 50,
    eur: 50,
    gbp: 30,
    ils: 200, // ≈ $0.50 → ₪2.00
    aud: 50,
    cad: 50,
    chf: 50,
    sek: 50,
    dkk: 50,
    nok: 50,
    // zero-decimal examples:
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
        `Amount too small for ${cur}: ${inputMinor}. Bumping to minimum ${minMinor}.`,
      );
      return minMinor;
    }
    return inputMinor;
  }

  /** Conservative server recompute in MINOR units.
   * Assumes `price` is MAJOR units (₪) so we *100.
   */
  private computeCartTotalMinor(
    cart: PlainItem[],
    shippingMajor: number,
    taxRate: number, // e.g., 0.17
    discountMinor: number, // already minor units
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

  // ======================== mutations ========================

  /** Direct order creation (non-Stripe flow). */
  async createOrder(dto: CreateOrderDto) {
    const plainItems = this.toPlainItems(dto.items);
    const now = this.nowTs();
    const uidNum = this.numericUid(dto.userId);

    const orderDoc = {
      userId: dto.userId,
      email: dto.email ?? null,
      items: plainItems,
      totalAmount: dto.totalAmount, // MINOR units
      paymentIntentId: dto.paymentIntentId ?? null,
      payment:
        dto.payment ??
        ({
          method: 'manual',
          status: 'paid',
          transactionId: dto.paymentIntentId || `manual-${Date.now()}`,
        } as const),
      status: dto.status ?? 'pending',
      ownerName: dto.ownerName ?? null,
      passportId: dto.passportId ?? null,
      shippingAddress: dto.shippingAddress ?? null,
      notes: dto.notes ?? null,
      statusHistory: [
        {
          status: dto.status ?? 'pending',
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

    return { id: ref.id, ...orderDoc };
  }

  /** Create a Stripe PaymentIntent (expects amount in MINOR units). */
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

    // 1) Log input
    this.logger.log(
      `PI request: currency=${currency}, clientMinor=${amountMinorFromClient}, cartItems=${cart?.length ?? 0}, shippingMajor=${shippingMajor}, taxRate=${taxRate}, discountMinor=${discountMinor}, uid=${uid}`,
    );

    // 2) Server recompute
    const serverMinor = this.computeCartTotalMinor(
      cart || [],
      shippingMajor,
      taxRate,
      discountMinor,
    );

    // 3) Choose amount (prefer server if > 0)
    const chosenMinor = serverMinor > 0 ? serverMinor : amountMinorFromClient;

    // 4) Enforce Stripe minimum
    const normalizedMinor = this.normalizeAmountMinor(chosenMinor, currency);

    this.logger.log(
      `PI amounts: serverMinor=${serverMinor}, clientMinor=${amountMinorFromClient}, chosenMinor=${chosenMinor}, normalizedMinor=${normalizedMinor}`,
    );

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
              priceMajor: i.price, // for transparency
              quantity: i.quantity,
              image: i.image,
            })),
          ),
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : '',
        },
      });

      this.logger.log(
        `Created PaymentIntent ${paymentIntent.id} with amount=${paymentIntent.amount} ${currency}`,
      );

      return { clientSecret: paymentIntent.client_secret };
    } catch (e: any) {
      this.logger.error(
        `Stripe PI creation failed: currency=${currency}, serverMinor=${serverMinor}, clientMinor=${amountMinorFromClient}, chosenMinor=${chosenMinor}, normalizedMinor=${normalizedMinor}`,
        e?.stack || String(e),
      );
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  /** Stripe webhook entry point. */
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

  /** Build & store an order from a successful PaymentIntent. */
  private async createOrderFromIntent(intent: Stripe.PaymentIntent) {
    const uid = intent.metadata?.uid;
    if (!uid) throw new Error('Missing uid in Stripe metadata');

    // Items from metadata
    let items: PlainItem[] = [];
    try {
      const raw = intent.metadata?.items || '[]';
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('items not array');
      items = parsed.map((i: unknown) => {
        const it = i as Record<string, unknown>;
        return {
          productId: String(it.productId ?? ''),
          name: String(it.name ?? ''),
          price: Number(it.price ?? 0), // MAJOR (kept for consistency)
          image: typeof it.image === 'string' ? it.image : undefined,
          quantity: Number(it.quantity ?? 0),
        };
      });
    } catch {
      this.logger.warn('Invalid items metadata in PaymentIntent');
    }

    // Shipping address: metadata -> intent.shipping fallback
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
      totalAmount: intent.amount, // MINOR units from Stripe
      paymentIntentId: intent.id,
      payment: {
        method: 'card' as const,
        status: 'paid' as const,
        transactionId: intent.id,
      },
      status: 'paid' as const,
      ownerName: intent.metadata?.ownerName ?? null,
      passportId: intent.metadata?.passportId ?? null,
      shippingAddress,
      statusHistory: [
        {
          status: 'paid',
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

  // ======================== queries ========================

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
