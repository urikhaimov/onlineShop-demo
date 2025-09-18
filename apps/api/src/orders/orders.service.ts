import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';

type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

function nowIso() {
  return new Date().toISOString();
}

// Stable idempotency key for cart+amount+currency (+ always tag user)
function buildIdemKey(params: {
  provided?: string | undefined;
  userId: string; // may be 'anon' if not logged in
  orderId?: string | undefined;
  amount: number; // cents
  currency: string; // lower-case, e.g. 'ils'
}) {
  // Deterministic fallback (without user)
  const fallback = `pi:${params.orderId ?? 'no-order'}:${params.currency}:${params.amount}`;

  // Use provided if present, but ALWAYS suffix with user tag
  const base = (params.provided?.trim() || fallback).trim();
  const tagged = `${base}:${params.userId || 'anon'}`;

  // Stripe limit 255 chars
  return tagged.length > 255 ? tagged.slice(0, 255) : tagged;
}

// Detect the Stripe “idempotent… same parameters” error
function isIdempotencyParamMismatch(e: any): boolean {
  const msg =
    (Array.isArray(e?.raw?.message)
      ? e.raw.message.join(', ')
      : e?.raw?.message) ||
    e?.message ||
    '';
  return /idempotent/i.test(msg) && /same parameters/i.test(msg);
}

// Strip undefined so Firestore merge won't blank fields
function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// Pull freshest customer/shipping from PI
function extractPeopleFromStripe(pi: Stripe.PaymentIntent) {
  const charge =
    typeof pi.latest_charge === 'string' ? undefined : pi.latest_charge;
  const billing = charge?.billing_details;
  const ship = pi.shipping;

  const shippingAddress = ship?.address
    ? defined({
        name: ship?.name ?? billing?.name,
        phone: ship?.phone ?? billing?.phone,
        address: defined({
          line1: ship?.address?.line1,
          city: ship?.address?.city,
          postalCode: ship?.address?.postal_code,
          country: ship?.address?.country,
        }),
      })
    : undefined;

  const customer = defined({
    name: billing?.name ?? ship?.name,
    email: billing?.email,
    phone: billing?.phone ?? ship?.phone,
  });

  return { shippingAddress, customer };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  public readonly stripe?: Stripe;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (!key && process.env.NODE_ENV === 'test') {
      this.stripe = new Stripe('sk_test_dummy', {
        apiVersion: '2024-06-20' as any,
      });
      this.logger.verbose('OrdersService: using dummy Stripe key in tests');
      return;
    }
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY in environment');
    this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
  }

  private col() {
    return adminDb.collection('orders');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Queries
  // ───────────────────────────────────────────────────────────────────────────
  async getPublicStatusByPaymentIntent(piId: string) {
    const doc = await this.col().doc(piId).get();
    if (doc.exists) {
      const o = doc.data() as any;
      return { state: String(o?.status ?? ''), orderId: doc.id };
    }
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
    if (role !== 'admin' && data.userId !== userId)
      throw new ForbiddenException();
    return { id: doc.id, ...data };
  }

  async getOrderDoc(orderId: string) {
    const doc = await this.col().doc(orderId).get();
    return doc.exists ? (doc.data() as any) : null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mutations
  // ───────────────────────────────────────────────────────────────────────────
  async createOrder(dto: any) {
    const id: string | undefined = dto.id;
    const ref = id ? this.col().doc(id) : this.col().doc();

    const payload = defined({
      id: ref.id,
      userId: dto.userId,
      items: dto.items ?? [],
      total: dto.total ?? dto.totalMajor ?? 0,
      totalMajor: dto.totalMajor ?? dto.total ?? 0,
      totalMinor:
        dto.totalMinor ??
        (typeof dto.total === 'number' ? Math.round(dto.total * 100) : 0),
      currency: (dto.currency ?? 'ils').toLowerCase(),
      status: (dto.status ?? 'open') as OrderStatus,
      paymentIntentId: dto.paymentIntentId ?? null,
      payment: dto.payment,
      shippingAddress: dto.shippingAddress,
      customer: dto.customer,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...dto,
    });

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
    const payload = defined({ ...dto, updatedAt: nowIso() });
    await ref.set(payload, { merge: true });
    this.logger.log(`updateOrder ${id}`);
    const after = await ref.get();
    return { id, ...(after.data() as any) };
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const ref = this.col().doc(orderId);
    await ref.set({ status, updatedAt: nowIso() }, { merge: true });
    this.logger.log(`Order ${orderId} → ${status}`);
  }

  async markPaidByPaymentIntentId(paymentIntentId: string) {
    const byId = await this.col().doc(paymentIntentId).get();
    if (byId.exists) {
      await byId.ref.set(
        { status: 'paid', updatedAt: nowIso() },
        { merge: true },
      );
      this.logger.log(`Order ${paymentIntentId} (id) → paid`);
      return;
    }
    const snap = await this.col()
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      await doc.ref.set(
        { status: 'paid', updatedAt: nowIso() },
        { merge: true },
      );
      this.logger.log(`Order ${doc.id} (pi=${paymentIntentId}) → paid`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Draft enrichment (called from checkout before confirm)
  // ───────────────────────────────────────────────────────────────────────────
  async saveDraftCheckoutDetails(input: {
    paymentIntentId: string;
    userId: string;
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
    updateStripePI?: boolean;
  }) {
    const {
      paymentIntentId,
      userId,
      items,
      customer,
      shippingAddress,
      updateStripePI,
    } = input;

    await this.col()
      .doc(paymentIntentId)
      .set(
        defined({
          id: paymentIntentId,
          userId,
          items: Array.isArray(items) ? items : undefined,
          customer,
          shippingAddress,
          updatedAt: nowIso(),
        }),
        { merge: true },
      );

    if (updateStripePI && this.stripe && shippingAddress?.address) {
      await this.stripe.paymentIntents.update(paymentIntentId, {
        shipping: {
          name: shippingAddress.name || customer?.name || undefined,
          phone: shippingAddress.phone || customer?.phone || undefined,
          address: {
            line1: shippingAddress.address.line1,
            city: shippingAddress.address.city,
            postal_code: shippingAddress.address.postalCode,
            country: shippingAddress.address.country,
          },
        },
      });
    }

    this.logger.log(`saveDraftCheckoutDetails ${paymentIntentId}`);
    const after = await this.col().doc(paymentIntentId).get();
    return { id: paymentIntentId, ...(after.data() as any) };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cleanup helpers
  // ───────────────────────────────────────────────────────────────────────────
  async cleanupOldDrafts(userId: string, keepId?: string, aggressive = false) {
    try {
      const snap = await this.col()
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const twoMinAgo = Date.now() - 2 * 60 * 1000;

      for (const d of snap.docs) {
        const id = d.id;
        const data = d.data() as any;

        if (id === keepId) continue;
        if (data?.paymentIntentId === keepId) continue;
        if (data?.status !== 'open') continue;

        const createdAtMs = Date.parse(data?.createdAt || '') || 0;
        if (!aggressive && createdAtMs > twoMinAgo) continue;

        try {
          if (this.stripe) {
            const pi = await this.stripe.paymentIntents.retrieve(id);
            if (!['succeeded', 'canceled', 'processing'].includes(pi.status)) {
              await this.stripe.paymentIntents.cancel(id);
            }
          }
        } catch (e) {
          this.logger.verbose?.(
            `cleanupOldDrafts cancel ${id}: ${(e as any)?.message || e}`,
          );
        }

        try {
          await d.ref.delete();
          this.logger.log(`cleanupOldDrafts: deleted draft ${id}`);
        } catch (e) {
          this.logger.warn(
            `cleanupOldDrafts delete ${id}: ${(e as any)?.message || e}`,
          );
        }
      }
    } catch (e) {
      this.logger.warn(`cleanupOldDrafts skipped: ${(e as any)?.message || e}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Stripe flows
  // ───────────────────────────────────────────────────────────────────────────
  async createPaymentIntent(input: {
    totalMajor: number;
    currency?: string;
    userId: string;
    orderId?: string;
    metadata?: Record<string, string>;
    email?: string;
    idempotencyKey?: string;
    cart?: any[];
  }) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const amountMinor = Math.max(0, Math.round((input.totalMajor ?? 0) * 100));
    const currency = (input.currency ?? 'ils').toLowerCase();

    const baseIdempotencyKey = buildIdemKey({
      provided: input.idempotencyKey,
      userId: input.userId || 'anon',
      orderId: input.orderId,
      amount: amountMinor,
      currency,
    });

    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountMinor,
      currency,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { request_three_d_secure: 'automatic' },
      },
      metadata: {
        userId: input.userId,
        orderId: input.orderId ?? '',
        app: 'onlineShop',
        ...(input.metadata ?? {}),
      },
      receipt_email: input.email || undefined,
    };

    const tryCreate = (idk: string) =>
      this.stripe!.paymentIntents.create(params, { idempotencyKey: idk });

    let pi: Stripe.PaymentIntent;
    try {
      pi = await tryCreate(baseIdempotencyKey);
    } catch (e) {
      if (!isIdempotencyParamMismatch(e)) throw e;
      // one-time recovery with salted key
      const salted = `${baseIdempotencyKey}:${Date.now().toString(36)}`.slice(
        0,
        255,
      );
      this.logger.warn(
        `createPaymentIntent retrying with salted key due to idempotency mismatch (was=${baseIdempotencyKey})`,
      );
      pi = await tryCreate(salted);
    }

    await this.col()
      .doc(pi.id)
      .set(
        defined({
          id: pi.id,
          userId: input.userId,
          status: 'open' as OrderStatus,
          total: amountMinor / 100,
          totalMajor: amountMinor / 100,
          totalMinor: amountMinor,
          currency,
          items: Array.isArray(input.cart) ? input.cart : [],
          paymentIntentId: pi.id,
          payment: defined({
            provider: 'stripe',
            method: 'card',
            currency,
            totalMinor: amountMinor,
            totalMajor: amountMinor / 100,
            transactionId: pi.id,
            status: 'requires_confirmation',
          }),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }),
        { merge: true },
      );

    this.logger.log(`createPaymentIntent ${pi.id} ${currency} ${amountMinor}`);

    // Keep the fresh draft, only clean up *older* open drafts (avoid racing with user submit)
    await this.cleanupOldDrafts(input.userId, pi.id, false);

    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  }

  /**
   * CONFIRM the PI if confirmable. Always ensures there’s a single document left:
   * - success → one PAID order with full details
   * - failure/other → one OPEN draft (the current PI) or next_action flow
   */
  async confirmPaymentIntent(input: {
    paymentIntentId: string;
    userId: string;
    paymentMethodId?: string;
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
    mirrorToStripe?: boolean;
    returnUrl?: string;
  }) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const {
      paymentIntentId,
      userId,
      paymentMethodId,
      customer,
      shippingAddress,
      mirrorToStripe,
      returnUrl,
    } = input;

    // Enrich draft (+ optionally PI) before confirm
    if (customer || shippingAddress) {
      await this.saveDraftCheckoutDetails({
        paymentIntentId,
        userId,
        customer,
        shippingAddress,
        updateStripePI: mirrorToStripe,
      });
    }

    // 1) Inspect current PI state
    let pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    // Switch BEFORE any narrowing branches (prevents TS2367 later)
    switch (pi.status) {
      case 'succeeded': {
        const order = await this.createOrderFromIntentById(pi.id, userId);
        await this.cleanupOldDrafts(userId, order.id, true);
        return {
          ok: true,
          status: 'succeeded',
          order,
          clientSecret: pi.client_secret ?? null,
        };
      }

      case 'requires_payment_method': {
        if (!paymentMethodId) {
          await this.cleanupOldDrafts(userId, pi.id, true);
          throw new ConflictException(
            'Payment method is missing. Attach a payment method and try again.',
          );
        }
        break;
      }

      case 'requires_confirmation': {
        break;
      }

      case 'requires_action':
      case 'processing': {
        await this.cleanupOldDrafts(userId, pi.id, true);
        return {
          ok: true,
          status: pi.status,
          nextAction: (pi as any).next_action ?? null,
          clientSecret: pi.client_secret ?? null,
        };
      }

      case 'canceled': {
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException('Payment was canceled.');
      }

      default: {
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(`Cannot confirm in state: ${pi.status}`);
      }
    }

    // 2) Confirm (only if we reached here from 'requires_*')
    pi = await this.stripe.paymentIntents.confirm(
      paymentIntentId,
      defined({
        payment_method: paymentMethodId,
        return_url: returnUrl,
      }),
    );

    // 3) Post-confirm inspection with a switch (again, compare first)
    switch (pi.status) {
      case 'succeeded': {
        const order = await this.createOrderFromIntentById(pi.id, userId);
        await this.cleanupOldDrafts(userId, order.id, true);
        return {
          ok: true,
          status: 'succeeded',
          order,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'requires_action':
      case 'processing': {
        await this.cleanupOldDrafts(userId, pi.id, true);
        return {
          ok: true,
          status: pi.status,
          nextAction: (pi as any).next_action ?? null,
          clientSecret: pi.client_secret ?? null,
        };
      }
      case 'canceled': {
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException('Payment was canceled.');
      }
      default: {
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(
          `Confirmation ended in state: ${pi.status}`,
        );
      }
    }
  }

  async createOrderFromIntentById(paymentIntentId: string, userId: string) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

    const draftSnap = await this.col().doc(pi.id).get();
    const draft = draftSnap.exists ? (draftSnap.data() as any) : {};

    const { shippingAddress, customer } = extractPeopleFromStripe(pi);

    switch (pi.status) {
      case 'succeeded':
        break;
      case 'processing':
      case 'requires_action':
      case 'requires_confirmation':
      case 'requires_payment_method':
      case 'requires_capture':
      case 'canceled': {
        await this.col()
          .doc(pi.id)
          .set(
            defined({
              status: 'open',
              shippingAddress: shippingAddress ?? draft.shippingAddress,
              customer: Object.keys(customer).length
                ? customer
                : draft.customer,
              updatedAt: nowIso(),
            }),
            { merge: true },
          );
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(
          `PaymentIntent ${pi.id} is ${pi.status}; cannot create order until it succeeds.`,
        );
      }
      default: {
        await this.cleanupOldDrafts(userId, pi.id, true);
        throw new ConflictException(`Unsupported PI state: ${pi.status}`);
      }
    }

    const orderId = (pi.metadata?.orderId as string) || paymentIntentId;
    const currency = (pi.currency || draft.currency || 'ils').toLowerCase();
    const amountMinor =
      (typeof pi.amount_received === 'number' && pi.amount_received > 0
        ? pi.amount_received
        : typeof pi.amount === 'number'
          ? pi.amount
          : draft.totalMinor) || 0;

    const payload = defined({
      id: orderId,
      userId,
      status: 'paid' as const,
      total: amountMinor / 100,
      totalMajor: amountMinor / 100,
      totalMinor: amountMinor,
      currency,
      items: Array.isArray(draft.items) ? draft.items : [],
      paymentIntentId: pi.id,
      payment: defined({
        provider: 'stripe',
        method: 'card',
        currency,
        totalMinor: amountMinor,
        totalMajor: amountMinor / 100,
        transactionId: pi.id,
        status: pi.status,
      }),
      shippingAddress: shippingAddress ?? draft.shippingAddress,
      customer: Object.keys(customer).length ? customer : draft.customer,
      createdAt: draft?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    });

    await this.col().doc(orderId).set(payload, { merge: true });

    await this.col()
      .doc(pi.id)
      .set(
        defined({
          status: 'paid',
          linkedOrderId: orderId,
          shippingAddress: payload.shippingAddress,
          customer: payload.customer,
          updatedAt: nowIso(),
        }),
        { merge: true },
      );

    await this.cleanupOldDrafts(userId, orderId, true);

    this.logger.log(`createOrderFromIntentById ${orderId} ← ${pi.status}`);
    return payload;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Webhooks
  // ───────────────────────────────────────────────────────────────────────────
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
      const userId = (pi.metadata?.userId as string) || 'unknown';
      const orderId = (pi.metadata?.orderId as string | undefined) ?? pi.id;

      await this.createOrderFromIntentById(pi.id, userId);
      if (orderId !== pi.id) await this.updateStatus(orderId, 'paid');

      return { received: true };
    } else if (event.type === 'checkout.session.completed') {
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
  // Tests helper
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
