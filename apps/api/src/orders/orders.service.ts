import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

import { adminDb } from '@common/firebase';
import { CreateOrderDto } from './dto/create-order.dto';

import type { PlainItem, CompactCartItem } from './types';
import { ZERO_DEC, toMinor } from './utils/currency.util';
import { numericUid } from './utils/hash.util';
import { nowTs } from './utils/time.util';
import {
  toPlainItems,
  buildItemsCompact,
  parseItemsJson,
  parseItemsCompact,
} from './utils/items.util';
import { toPlainAddress } from './utils/address.util';
import { toPlainPayment } from './utils/payment.util';
import {
  extractEmailFromPI,
  extractShippingFromPI,
} from './utils/stripe-parse.util';

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
    return nowTs();
  }

  private numericUid(uid: string) {
    return numericUid(uid);
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

  // ---------------- mutations ----------------

  async createOrder(dto: CreateOrderDto) {
    try {
      const plainItems = toPlainItems(dto.items);
      const plainPayment = toPlainPayment(dto.payment);
      const plainAddress = toPlainAddress(dto.shippingAddress);

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

  // ---------------- Stripe PI creation ----------------

  async createPaymentIntent(params: {
    totalMajor: number; // MAJOR units (e.g., 71.11)
    currency?: string; // 'ILS', 'USD', ...
    userId?: string; // -> metadata.uid
    email?: string;
    idempotencyKey?: string;
    metadata?: Record<string, string | number | boolean | null | undefined>;
    cart?: CompactCartItem[]; // compacted into metadata safely
  }) {
    const { userId, email, idempotencyKey, metadata, cart } = params;

    const cur = (params.currency ?? 'ILS').toUpperCase();
    const totalMajor = Number.isFinite(params.totalMajor as number)
      ? Number(params.totalMajor)
      : 0;

    let amountMinor = toMinor(totalMajor, cur);
    if (cur === 'ILS' && amountMinor < 200) amountMinor = 200;

    const coerce = (obj?: Record<string, any>) =>
      obj
        ? Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [
              k,
              v === null ? '' : String(v),
            ]),
          )
        : {};

    const { compact: items_compact, count: item_count } =
      buildItemsCompact(cart);

    const md: Record<string, string> = {
      uid: userId ?? '',
      userId: userId ?? '',
      totalMajor: totalMajor.toFixed(2),
      currency: cur,
      email: email ?? '',
      ...coerce(metadata),
      item_count: String(item_count),
    };
    if (items_compact) md.items_compact = items_compact;

    const intent = await this.stripe.paymentIntents.create(
      {
        amount: amountMinor,
        currency: cur.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        capture_method: 'automatic',
        payment_method_options: {
          card: { request_three_d_secure: 'automatic' },
        },
        metadata: md,
      },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (!intent.client_secret) {
      throw new InternalServerErrorException(
        'Stripe did not return a client secret',
      );
    }
    return { clientSecret: intent.client_secret, intentId: intent.id };
  }

  /** Create (idempotent) order from a Stripe PaymentIntent */
  private async createOrderFromIntent(intent: Stripe.PaymentIntent) {
    const uid = intent.metadata?.uid || intent.metadata?.userId;
    if (!uid) throw new Error('Missing uid in Stripe metadata');

    // Items: prefer legacy JSON, fallback to compact
    let items: PlainItem[] = parseItemsJson(intent.metadata?.items);
    if (!items.length)
      items = parseItemsCompact(intent.metadata?.items_compact);

    // Shipping & email
    const shippingAddress = extractShippingFromPI(intent);
    const email = extractEmailFromPI(intent);

    const now = this.nowTs();
    const uidNum = this.numericUid(uid);

    const amountMinor =
      typeof intent.amount_received === 'number' && intent.amount_received > 0
        ? intent.amount_received
        : (intent.amount ?? 0);

    const orderDoc = {
      userId: uid,
      email,
      items,
      totalAmount: amountMinor, // MINOR
      paymentIntentId: intent.id,
      payment: {
        method: 'card' as const,
        status: 'paid' as const,
        transactionId: intent.id,
        currency: intent.currency,
      },
      status: 'confirmed' as const,
      ownerName:
        intent.metadata?.ownerName ?? shippingAddress?.fullName ?? null,
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
        createdBy: { uid: uidNum, name: email || '' },
        updatedBy: { uid: uidNum, name: email || '' },
        createdAt: now,
        updatedAt: now,
      },
    };

    // Idempotent: PI id == order id
    const ref = adminDb.collection('orders').doc(intent.id);
    const exists = await ref.get();
    if (exists.exists) {
      this.logger.log(`Order already exists for PI ${intent.id}`);
      return { id: exists.id, ...(exists.data() as any) };
    }

    await ref.set({ id: ref.id, ...orderDoc }, { merge: false });

    if (items.length) {
      await this.decrementStock(
        items.map(({ productId, quantity }) => ({ productId, quantity })),
      );
    }

    this.logger.log(`Order created from Stripe intent: ${ref.id}`);
    return { id: ref.id, ...orderDoc };
  }

  /** Called by controller when webhooks can’t reach your server */
  async createOrderFromIntentById(intentId: string, expectedUid?: string) {
    try {
      const pi = (await this.stripe.paymentIntents.retrieve(intentId, {
        expand: ['latest_charge'],
      })) as Stripe.PaymentIntent;

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
      return this.createOrderFromIntent(pi);
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
      if (!rawBody || !signature)
        throw new BadRequestException('Missing raw body or signature');

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      switch (event.type) {
        case 'payment_intent.processing':
          this.logger.log('PI processing');
          break;

        case 'payment_intent.succeeded': {
          const piId = (event.data.object as any).id as string;
          const fullPi = (await this.stripe.paymentIntents.retrieve(piId, {
            expand: ['latest_charge'],
          })) as Stripe.PaymentIntent;
          await this.createOrderFromIntent(fullPi);
          break;
        }

        case 'payment_intent.payment_failed':
          this.logger.warn('PI failed');
          break;

        default:
          break;
      }

      return { received: true };
    } catch (err) {
      this.logger.error('Stripe webhook error', err as Error);
      throw new InternalServerErrorException('Webhook handling failed');
    }
  }

  // ---------------- public polling endpoint ----------------
  async getPublicStatusByPaymentIntent(piId: string) {
    if (!piId || !piId.startsWith('pi_')) {
      throw new BadRequestException('Invalid payment intent id');
    }

    // 1) Direct doc
    try {
      const direct = await adminDb.collection('orders').doc(piId).get();
      if (direct.exists) return { state: 'succeeded', orderId: piId };
    } catch (e) {
      this.logger.warn(`Direct order lookup failed for ${piId}: ${String(e)}`);
    }

    // 2) By transaction id
    try {
      const snap = await adminDb
        .collection('orders')
        .where('payment.transactionId', '==', piId)
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        return { state: 'succeeded', orderId: doc.id };
      }
    } catch (e) {
      this.logger.warn(`Order query by tx failed for ${piId}: ${String(e)}`);
    }

    // 3) Ask Stripe (expanded)
    let pi: Stripe.PaymentIntent;
    try {
      pi = (await this.stripe.paymentIntents.retrieve(piId, {
        expand: ['latest_charge'],
      })) as Stripe.PaymentIntent;
    } catch (e: any) {
      this.logger.warn(`PI retrieve failed for ${piId}: ${String(e)}`);
      throw new NotFoundException('PaymentIntent not found');
    }

    this.logger.log(`PI ${piId} status=${pi.status}`);

    if (pi.status === 'succeeded') {
      try {
        const created = await this.createOrderFromIntent(pi);
        return { state: 'succeeded', orderId: created.id };
      } catch (e) {
        this.logger.warn(
          `Create order from PI in public poll failed (${piId}): ${String(e)}`,
        );
      }
    }

    return { state: String(pi.status), orderId: undefined };
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

  async getOrderDoc(id: string) {
    if (!id) return null;
    try {
      const snap = await adminDb.collection('orders').doc(id).get();
      return snap.exists ? (snap.data() as any) : null;
    } catch (e) {
      this.logger.error(`getOrderDoc failed for id=${id}`, e as any);
      return null;
    }
  }
}
