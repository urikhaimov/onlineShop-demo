import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';

type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  // Optional so tests can run without Stripe
  public readonly stripe?: Stripe;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';

    // In tests, don’t hard-fail — use a dummy key
    if (!key && process.env.NODE_ENV === 'test') {
      this.stripe = new Stripe('sk_test_dummy', {
        apiVersion: '2024-06-20' as any,
      });
      this.logger.verbose('OrdersService: using dummy Stripe key in tests');
      return;
    }

    // In non-test envs, keep the guard strict
    if (!key) {
      throw new Error('Missing STRIPE_SECRET_KEY in environment');
    }

    // Note: casting apiVersion avoids type unions mismatching your installed @types
    this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Firestore helpers
  // ───────────────────────────────────────────────────────────────────────────
  private col() {
    return adminDb.collection('orders');
  }

  private nowIso() {
    return new Date().toISOString();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public status lookup (already used by /orders/public/:piId)
  // ───────────────────────────────────────────────────────────────────────────
  async getPublicStatusByPaymentIntent(piId: string) {
    // Try by doc id
    const doc = await this.col().doc(piId).get();
    if (doc.exists) {
      const o = doc.data() as any;
      return { state: String(o?.status ?? ''), orderId: doc.id };
    }
    // Try by paymentIntentId
    const q = await this.col()
      .where('paymentIntentId', '==', piId)
      .limit(1)
      .get();
    if (!q.empty) {
      const d = q.docs[0];
      const o = d.data() as any;
      return { state: String(o?.status ?? ''), orderId: d.id };
    }
    return { state: '', orderId: null };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Queries used by controllers
  // ───────────────────────────────────────────────────────────────────────────
  async getOrdersByUserId(userId: string) {
    const snap = await this.col()
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  async getAllOrders() {
    const snap = await this.col().orderBy('createdAt', 'desc').limit(200).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  }

  async getOrderById(
    userId: string,
    orderId: string,
    role: 'admin' | 'user' | string = 'user',
  ) {
    const ref = this.col().doc(orderId);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Order not found');
    const data = doc.data() as any;
    if (role !== 'admin' && data.userId !== userId) {
      throw new ForbiddenException();
    }
    return { id: doc.id, ...data };
  }

  async getOrderDoc(orderId: string) {
    const doc = await this.col().doc(orderId).get();
    return doc.exists ? (doc.data() as any) : null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mutations used by controllers & webhooks
  // ───────────────────────────────────────────────────────────────────────────
  async createOrder(dto: any) {
    // If caller provides id, use it (common when using paymentIntentId as id)
    const id: string | undefined = dto.id;
    const ref = id ? this.col().doc(id) : this.col().doc();
    const payload = {
      id: ref.id,
      userId: dto.userId,
      items: dto.items ?? [],
      total: dto.total ?? dto.totalMajor ?? 0,
      currency: (dto.currency ?? 'ils').toLowerCase(),
      status: (dto.status ?? 'open') as OrderStatus,
      paymentIntentId: dto.paymentIntentId ?? null,
      createdAt: this.nowIso(),
      updatedAt: this.nowIso(),
      ...dto,
    };
    await ref.set(payload, { merge: true });
    this.logger.log(`createOrder ${ref.id} → ${payload.status}`);
    return payload;
  }

  async updateOrder(id: string, dto: any, byUserId?: string) {
    const ref = this.col().doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundException('Order not found');
    const curr = doc.data() as any;
    if (byUserId && curr.userId && curr.userId !== byUserId) {
      throw new ForbiddenException();
    }
    const payload = { ...dto, updatedAt: this.nowIso() };
    await ref.set(payload, { merge: true });
    this.logger.log(`updateOrder ${id}`);
    return { id, ...(await (await ref.get()).data()) };
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const ref = this.col().doc(orderId);
    await ref.set({ status, updatedAt: this.nowIso() }, { merge: true });
    this.logger.log(`Order ${orderId} → ${status}`);
  }

  async markPaidByPaymentIntentId(paymentIntentId: string) {
    // Try by doc id first
    const byId = await this.col().doc(paymentIntentId).get();
    if (byId.exists) {
      await byId.ref.set(
        { status: 'paid', updatedAt: this.nowIso() },
        { merge: true },
      );
      this.logger.log(`Order ${paymentIntentId} (id) → paid`);
      return;
    }
    // Fallback: query by field
    const snap = await this.col()
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      await doc.ref.set(
        { status: 'paid', updatedAt: this.nowIso() },
        { merge: true },
      );
      this.logger.log(`Order ${doc.id} (pi=${paymentIntentId}) → paid`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Stripe flows used by your controller & tests
  // ───────────────────────────────────────────────────────────────────────────
  async createPaymentIntent(input: {
    totalMajor: number;
    currency?: string;
    userId: string;
    orderId?: string;
    metadata?: Record<string, string>;
    /** Optional extras from controller/tests */
    email?: string;
    idempotencyKey?: string;
    cart?: any[];
  }) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const amount = Math.max(0, Math.round((input.totalMajor ?? 0) * 100));
    const currency = (input.currency ?? 'ils').toLowerCase();

    // Prefer caller-provided idempotency key; otherwise derive a stable one
    const fallbackKey = `pi:${input.userId}:${currency}:${amount}`;
    const idempotencyKey = input.idempotencyKey || fallbackKey;

    const pi = await this.stripe.paymentIntents.create(
      {
        amount,
        currency,
        metadata: {
          userId: input.userId,
          orderId: input.orderId ?? '',
          app: 'onlineShop',
          ...(input.metadata ?? {}),
        },
        automatic_payment_methods: { enabled: true },
        receipt_email: input.email || undefined,
      },
      { idempotencyKey },
    );

    // Store a lightweight draft so we can match webhooks later if you want
    await this.col()
      .doc(pi.id)
      .set(
        {
          id: pi.id,
          userId: input.userId,
          status: 'open',
          total: amount / 100,
          currency,
          paymentIntentId: pi.id,
          createdAt: this.nowIso(),
          updatedAt: this.nowIso(),
        },
        { merge: true },
      );

    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  }

  async createOrderFromIntentById(paymentIntentId: string, userId: string) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    const orderId = (pi.metadata?.orderId as string) || paymentIntentId;
    const currency = (pi.currency || 'ils').toLowerCase();

    const payload = {
      id: orderId,
      userId,
      status: (pi.status === 'succeeded' ? 'paid' : 'open') as OrderStatus,
      total: (pi.amount_received || pi.amount || 0) / 100,
      currency,
      paymentIntentId: pi.id,
      createdAt: this.nowIso(),
      updatedAt: this.nowIso(),
    };

    await this.col().doc(orderId).set(payload, { merge: true });
    this.logger.log(`createOrderFromIntentById ${orderId} ← ${pi.status}`);
    return payload;
  }

  // Legacy endpoint compatibility: controller might still call this
  async handleStripeWebhook(rawBody: string | Buffer, signature?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    let event: Stripe.Event;

    try {
      if (this.stripe && secret && signature) {
        event = this.stripe.webhooks.constructEvent(
          rawBody as any,
          signature,
          secret,
        );
      } else {
        // Dev-friendly fallback
        const raw =
          typeof rawBody === 'string' ? rawBody : rawBody?.toString('utf8');
        event = JSON.parse(raw || '{}');
      }
    } catch (e: any) {
      this.logger.warn(`Webhook verify/parse failed: ${e?.message || e}`);
      throw e;
    }

    this.logger.log(`handleStripeWebhook: ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = (pi.metadata?.orderId as string | undefined) ?? undefined;
      if (orderId) {
        await this.updateStatus(orderId, 'paid');
      } else {
        await this.markPaidByPaymentIntentId(pi.id);
      }
    } else if (event.type === 'checkout.session.completed') {
      // session.payment_intent is typically an ID string
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId =
        (session.metadata?.orderId as string | undefined) ?? undefined;

      if (orderId) {
        await this.updateStatus(orderId, 'paid');
      } else if (typeof session.payment_intent === 'string') {
        await this.markPaidByPaymentIntentId(session.payment_intent);
      }
    } else if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      const oid = (charge.metadata?.orderId as string | undefined) ?? undefined;
      if (oid) await this.updateStatus(oid, 'paid');
    }

    return { received: true };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Test-only helper used by relaxed webhook matching (E2E_RELAXED_MATCH)
  // ───────────────────────────────────────────────────────────────────────────
  async findMostRecentOpenOrderId(): Promise<string | null> {
    const snap = await this.col()
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].id;
  }
}
