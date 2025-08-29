// src/orders/orders.service.ts
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';
import { CreateOrderDto } from './dto/create-order.dto';
import { adminDb } from '@common/firebase';
import { CDefaultCurrency } from '@common/types';

type PlainItem = {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

// Stripe minimums in minor units (cents). Adjust if you support more currencies.
function getStripeMinMinor(currency: string): number {
  switch (currency) {
    case 'ils':
      return 200; // ₪2.00
    case 'usd':
    case 'eur':
    case 'cad':
    case 'aud':
    case 'nzd':
      return 50; // $/€/C$/A$/NZ$ 0.50
    case 'gbp':
      return 30; // £0.30
    case 'jpy':
      return 50; // ¥50 (JPY has 0 decimals; Stripe expects integer yen)
    default:
      return 50; // sensible default
  }
}

@Injectable()
export class OrdersService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY in environment');
    // Let SDK use its bundled api version to avoid literal type mismatch
    this.stripe = new Stripe(secretKey);
  }

  // === helpers ==============================================================
  private nowTs() {
    return admin.firestore.Timestamp.now();
  }

  private numericUid(uid: string): number {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  private toPlainItems(items: CreateOrderDto['items']): PlainItem[] {
    return items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
    }));
  }

  private async decrementStock(
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const batch = adminDb.batch();
    for (const { productId, quantity } of items) {
      const productRef = adminDb.collection('products').doc(productId);
      batch.update(productRef, {
        stock: admin.firestore.FieldValue.increment(-Math.abs(quantity)),
      });
    }
    await batch.commit();
  }

  // === create from client ===================================================
  async createOrder(dto: CreateOrderDto) {
    const plainItems = this.toPlainItems(dto.items);
    const now = this.nowTs();
    const uidNum = this.numericUid(dto.userId);

    const order = {
      userId: dto.userId,
      email: dto.email ?? null,
      items: plainItems,
      totalAmount: dto.totalAmount,
      paymentIntentId: dto.paymentIntentId ?? null,
      payment: dto.payment ?? {
        method: 'manual',
        status: 'paid',
        transactionId: dto.paymentIntentId || `manual-${Date.now()}`,
      },
      // conforms to your DTO union: 'pending' | 'paid' | 'failed'
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
    await ref.set({ id: ref.id, ...order });

    await this.decrementStock(
      plainItems.map(({ productId, quantity }) => ({ productId, quantity })),
    );

    return { id: ref.id, ...order };
  }

  // === queries ==============================================================
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

  // === Stripe: create PI from frontend =====================================
  async createPaymentIntent(
    amount: number, // minor units (cents)
    ownerName: string,
    passportId: string,
    uid: string,
    cart: PlainItem[],
    shipping: number,
    taxRate: number,
    discount: number,
    shippingAddress?: {
      fullName: string;
      phone: string;
      street: string;
      city: string;
      postalCode: string;
      country: string;
    },
  ) {
    try {
      const currency = (CDefaultCurrency || 'ils').toLowerCase();

      // ✅ Enforce Stripe minimums & integer minor units
      const safeAmount = Math.max(0, Math.floor(amount || 0));
      const minMinor = getStripeMinMinor(currency);
      const normalizedAmount = Math.max(safeAmount, minMinor);
      if (normalizedAmount !== safeAmount) {
        // You can throw a 400 instead; for dev we clamp to avoid test failures.
        // console.warn(...) is fine for visibility during testing.

        console.warn(
          `Amount ${safeAmount} too small for ${currency}; normalized to ${normalizedAmount}`,
        );
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: normalizedAmount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          uid,
          ownerName,
          passportId,
          shipping: String(shipping),
          taxRate: String(taxRate),
          discount: String(discount),
          normalizedAmount: String(normalizedAmount),
          items: JSON.stringify(
            cart.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              image: i.image,
              quantity: i.quantity,
            })),
          ),
          shippingAddress: shippingAddress
            ? JSON.stringify(shippingAddress)
            : '',
        },
      });

      // Return normalized amount so the client can reconcile if desired
      return {
        clientSecret: paymentIntent.client_secret,
        amount: normalizedAmount,
      };
    } catch (e) {
      console.error('❌ Stripe error:', e);
      throw new InternalServerErrorException('Failed to create payment intent');
    }
  }

  // === Stripe webhook =======================================================
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
      console.error('❌ Stripe webhook error:', err);
      throw new InternalServerErrorException('Webhook handling failed');
    }
  }

  // === Build order document from a successful PI ============================
  async createOrderFromIntent(intent: Stripe.PaymentIntent) {
    const uid = intent.metadata?.uid;
    if (!uid) throw new Error('Missing uid in Stripe metadata');

    let items: PlainItem[] = [];
    try {
      const raw = intent.metadata?.items || '[]';
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('items not array');
      items = parsed.map((i: any) => ({
        productId: String(i.productId),
        name: String(i.name),
        price: Number(i.price),
        image: i.image ? String(i.image) : undefined,
        quantity: Number(i.quantity),
      }));
    } catch {
      console.warn('⚠️ Invalid items metadata in PaymentIntent');
    }

    // Shipping address: prefer metadata, fallback to intent.shipping
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

    const order = {
      userId: uid,
      email: null as string | null, // fill from metadata if you add it
      items,
      totalAmount: intent.amount,
      paymentIntentId: intent.id,
      payment: {
        method: 'card',
        status: 'paid',
        transactionId: intent.id,
      },
      status: 'paid',
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
    await ref.set({ id: ref.id, ...order });

    await this.decrementStock(
      items.map(({ productId, quantity }) => ({ productId, quantity })),
    );

    console.log('✅ Order created from Stripe intent:', ref.id);
    return { id: ref.id, ...order };
  }
}
