import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { MailerService } from '../mailer/mailer.service';
import { InvoiceService } from '../invoice/invoice.service';

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
  const fallback = `pi:${params.orderId ?? 'no-order'}:${params.currency}:${params.amount}`;
  const base = (params.provided?.trim() || fallback).trim();
  const tagged = `${base}:${params.userId || 'anon'}`;
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

/** Top-level strip (kept for a few call-sites). */
function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

/** 🔧 Recursively remove all `undefined` values (Firestore-safe). */
function stripUndefinedDeep<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, any>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as unknown as T;
  }
  return value;
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

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly invoice?: InvoiceService,
  ) {
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

  private productsCol() {
    return adminDb.collection('products');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Stock helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Idempotently decrement stock for all items in the order.
   * Writes `stockDecrementedAt` on the order to ensure single-apply semantics.
   */
  private async decrementStockForOrder(orderId: string, items: any[] = []) {
    if (!Array.isArray(items) || items.length === 0) {
      this.logger.warn(`decrementStockForOrder: no items for ${orderId}`);
      await this.col()
        .doc(orderId)
        .set(
          { stockDecrementedAt: nowIso(), updatedAt: nowIso() },
          { merge: true },
        );
      return { updated: 0, skipped: items.length, errors: 0 };
    }

    // Aggregate quantities per product (handles duplicates in cart)
    const qtyById = new Map<string, number>();
    for (const it of items) {
      const productId = String(it.productId || it.id || '').trim();
      const qty = Math.max(0, Number(it.quantity ?? it.qty ?? 1) || 0);
      if (!productId || qty <= 0) continue;
      qtyById.set(productId, (qtyById.get(productId) || 0) + qty);
    }
    const productIds = [...qtyById.keys()];
    if (productIds.length === 0) {
      await this.col()
        .doc(orderId)
        .set(
          { stockDecrementedAt: nowIso(), updatedAt: nowIso() },
          { merge: true },
        );
      return { updated: 0, skipped: items.length, errors: 0 };
    }

    const res = await adminDb.runTransaction(async (tx) => {
      const orderRef = this.col().doc(orderId);

      // ── PHASE A: READS (all reads BEFORE any writes)
      const orderSnap = await tx.get(orderRef);
      const already = orderSnap.exists && orderSnap.get('stockDecrementedAt');
      if (already) return { updated: 0, skipped: 0, errors: 0, already: true };

      const productRefs = productIds.map((id) => this.productsCol().doc(id));
      const snaps: DocumentSnapshot[] = await Promise.all(
        productRefs.map((r) => tx.get(r)),
      );

      // ── PHASE B: WRITES
      let updated = 0,
        errors = 0;
      const skipped = 0;

      snaps.forEach((snap, i) => {
        const ref = productRefs[i];
        const id = ref.id;
        const need = qtyById.get(id)!;

        if (!snap.exists) {
          this.logger.warn(
            `decrementStockForOrder: missing product ${id} (order=${orderId})`,
          );
          errors++;
          return;
        }

        const curr = snap.data() as any;
        const stock = Math.max(0, Number(curr?.stock ?? 0));
        const newStock = Math.max(0, stock - need);

        // If you want strict enforcement, throw when stock < need.
        tx.update(ref, {
          stock: newStock,
          sold: FieldValue.increment(need),
          updatedAt: nowIso(),
        });
        updated++;
      });

      tx.set(
        orderRef,
        { stockDecrementedAt: nowIso(), updatedAt: nowIso() },
        { merge: true },
      );
      return { updated, skipped, errors, already: false };
    });

    const note = (res as any).already ? 'already-decremented' : 'decremented';
    this.logger.log(
      `stock ${note} for ${orderId}: updated=${res.updated} skipped=${res.skipped} errors=${res.errors}`,
    );
    return res;
  }

  /**
   * Minimal email sender for non-Stripe/manual-paid cases.
   * Uses MailerService if available; de-dupes via `receiptSentAt`.
   */
  private async sendManualReceiptIfNeeded(order: any) {
    try {
      if (!this.mailer?.sendOrderConfirmation) return;

      const ref = this.col().doc(order.id);
      const snap = await ref.get();
      const already =
        snap.exists && (snap.get('receiptSentAt') as string | undefined);
      if (already) {
        this.logger.log(`receipt already sent for ${order.id} @ ${already}`);
        return;
      }

      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`no recipient email for order ${order.id}`);
        return;
      }

      let invoiceUrl: string | undefined;
      try {
        if (this.invoice?.ensureInvoice) {
          const inv = await this.invoice.ensureInvoice(order.id, {
            force: false,
          });
          invoiceUrl = inv?.url;
        }
      } catch (e) {
        this.logger.warn(
          `ensureInvoice failed for ${order.id}: ${(e as Error).message}`,
        );
      }

      const currency = (order?.currency || order?.payment?.currency || 'ILS')
        .toString()
        .toUpperCase();
      const amountMinor = Number(
        order?.totalMinor ??
          order?.payment?.totalMinor ??
          Math.round((order?.total || 0) * 100),
      );

      await this.mailer.sendOrderConfirmation(to, {
        orderId: String(order.id),
        amount: amountMinor || 0,
        currency,
        paymentIntentId:
          order?.paymentIntentId || order?.payment?.transactionId,
        created: false,
        invoiceUrl,
      });

      await ref.set(
        { receiptSentAt: nowIso(), updatedAt: nowIso() },
        { merge: true },
      );
      this.logger.log(`receipt sent for ${order.id} → ${to}`);
    } catch (e) {
      this.logger.warn(
        `sendManualReceiptIfNeeded failed for ${order?.id}: ${(e as Error).message}`,
      );
    }
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

    const payload = stripUndefinedDeep({
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

    // If created as PAID (manual/admin path), decrement & email
    if (payload.status === 'paid') {
      await this.decrementStockForOrder(ref.id, payload.items || []);
      await this.sendManualReceiptIfNeeded({ id: ref.id, ...payload });
    }

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

    const prevStatus: OrderStatus = curr.status as OrderStatus;
    const nextStatus: OrderStatus = (dto.status ?? prevStatus) as OrderStatus;

    const payload = stripUndefinedDeep({ ...dto, updatedAt: nowIso() });
    await ref.set(payload, { merge: true });
    this.logger.log(`updateOrder ${id}`);
    const afterSnap = await ref.get();
    const after = { id, ...(afterSnap.data() as any) };

    // If status moved to PAID, do the side-effects
    if (prevStatus !== 'paid' && nextStatus === 'paid') {
      await this.decrementStockForOrder(id, after.items || []);
      await this.sendManualReceiptIfNeeded(after);
    }

    return after;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const ref = this.col().doc(orderId);
    const before = await ref.get();
    const prevStatus: OrderStatus = (before.data() as any)?.status;

    await ref.set({ status, updatedAt: nowIso() }, { merge: true });
    this.logger.log(`Order ${orderId} → ${status}`);

    // If this call flips to PAID (e.g., from a webhook handler), also decrement
    if (prevStatus !== 'paid' && status === 'paid') {
      const afterSnap = await ref.get();
      const order = { id: orderId, ...(afterSnap.data() as any) };
      await this.decrementStockForOrder(orderId, order.items || []);
      // Email handled in Stripe path by sendReceiptIfNeeded; here we do nothing.
    }
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
        stripUndefinedDeep({
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
        stripUndefinedDeep({
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

    // Compare first, then branch
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

    // 2) Confirm
    pi = await this.stripe.paymentIntents.confirm(
      paymentIntentId,
      defined({
        payment_method: paymentMethodId,
        return_url: returnUrl,
      }),
    );

    // 3) Post-confirm inspection
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

  // ---- email helpers (Option A hybrid) --------------------------------------
  private async getRecipientEmail(opts: {
    pi: Stripe.PaymentIntent;
    draft?: any;
  }): Promise<string | undefined> {
    const { pi, draft } = opts;
    const charge =
      typeof pi.latest_charge === 'string' ? undefined : pi.latest_charge;

    const fromPi =
      (pi.metadata?.email as string | undefined) ||
      (pi.receipt_email as string | undefined);

    const fromCharge =
      (charge?.billing_details?.email as string | undefined) || undefined;

    const fromDraft =
      (draft?.customer?.email as string | undefined) ||
      (draft?.email as string | undefined);

    return fromPi || fromCharge || fromDraft || undefined;
  }

  // Plain order (no PI) → best-effort address
  private getEmailFromOrder(order: any): string | undefined {
    return (
      order?.email ||
      order?.customer?.email ||
      order?.payment?.receipt_email ||
      undefined
    );
  }

  private renderOrderUpdateHtml(ctx: {
    orderId: string;
    status?: string;
    provider?: string;
    trackingNumber?: string;
    eta?: string;
  }) {
    const lines: string[] = [];
    if (ctx.status) lines.push(`<b>Status:</b> ${ctx.status}`);
    if (ctx.provider) lines.push(`<b>Provider:</b> ${ctx.provider}`);
    if (ctx.trackingNumber)
      lines.push(`<b>Tracking:</b> ${ctx.trackingNumber}`);
    if (ctx.eta) lines.push(`<b>ETA:</b> ${ctx.eta}`);
    return `<p>Hi,</p><p>Your order <b>${ctx.orderId}</b> was updated.</p><p>${lines.join(
      '<br/>',
    )}</p>`;
  }

  private async sendReceiptIfNeeded(
    orderId: string,
    pi: Stripe.PaymentIntent,
    draft?: any,
  ) {
    try {
      if (!this.mailer?.sendOrderConfirmation) return;

      const ref = this.col().doc(orderId);
      const snap = await ref.get();

      const alreadyAt = snap.exists
        ? (snap.get('receiptSentAt') as string | undefined)
        : undefined;
      const alreadyFor = snap.exists
        ? (snap.get('receiptSentFor') as string | undefined)
        : undefined;

      // ✅ Only skip if we've already sent for THIS payment intent
      if (alreadyAt && alreadyFor === pi.id) {
        this.logger.log(
          `receipt already sent for ${orderId} (pi=${pi.id}) @ ${alreadyAt}`,
        );
        return;
      }

      // Resolve recipient
      const charge =
        typeof pi.latest_charge === 'string' ? undefined : pi.latest_charge;
      const to =
        (pi.metadata?.email as string | undefined) ||
        (pi.receipt_email as string | undefined) ||
        (charge?.billing_details?.email as string | undefined) ||
        (draft?.customer?.email as string | undefined) ||
        (draft?.email as string | undefined);

      if (!to) {
        this.logger.warn(
          `no recipient email for order ${orderId} (pi=${pi.id})`,
        );
        return;
      }

      // Optional: try to mint an invoice; failure is non-fatal
      let invoiceUrl: string | undefined;
      try {
        if (this.invoice?.ensureInvoice) {
          const inv = await this.invoice.ensureInvoice(orderId, {
            force: false,
          });
          invoiceUrl = inv?.url;
        }
      } catch (e) {
        this.logger.warn(
          `ensureInvoice failed for ${orderId}: ${(e as Error).message}`,
        );
      }

      const amountMinor = Number(pi.amount_received ?? pi.amount ?? 0);
      const currency = (pi.currency ?? 'ILS').toUpperCase();

      await this.mailer.sendOrderConfirmation(to, {
        orderId,
        amount: amountMinor,
        currency,
        paymentIntentId: pi.id,
        created: false,
        invoiceUrl,
      });

      await ref.set(
        {
          receiptSentAt: nowIso(),
          receiptSentFor: pi.id, // bind to this transaction
          updatedAt: nowIso(),
        },
        { merge: true },
      );

      this.logger.log(`receipt sent for ${orderId} (pi=${pi.id}) → ${to}`);
    } catch (e) {
      this.logger.warn(
        `sendReceiptIfNeeded failed for ${orderId}: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Email the customer on admin updates (status, delivery, etc.).
   * Called from the controller after a successful PATCH.
   */
  async notifyCustomer(
    order: any,
    patch: any = {},
    actor?: { uid?: string; email?: string } | null,
  ): Promise<void> {
    try {
      if (!this.mailer) return; // mailer not wired in env
      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`notifyCustomer: no recipient email for ${order?.id}`);
        return;
      }

      const ctx = {
        orderId: String(order.id || order.paymentIntentId || ''),
        status: (patch?.status ?? order?.status) as string | undefined,
        provider:
          patch?.delivery?.provider ??
          (order?.delivery && order.delivery.provider),
        trackingNumber:
          patch?.delivery?.trackingNumber ??
          (order?.delivery && order.delivery.trackingNumber),
        eta:
          patch?.delivery?.eta ??
          (order?.delivery && (order.delivery.eta as any)),
      };

      // Prefer a dedicated template if your MailerService exposes it
      const hasUpdateTemplate =
        typeof (this.mailer as any)?.sendOrderUpdate === 'function';

      if (hasUpdateTemplate) {
        await (this.mailer as any).sendOrderUpdate.call(this.mailer, to, ctx);
      } else if (this.mailer.sendOrderConfirmation) {
        // Fallback: reuse confirmation template (minimal info)
        const currency = (order?.currency || order?.payment?.currency || 'ILS')
          .toString()
          .toUpperCase();
        const amountMinor = Number(
          order?.totalMinor ??
            order?.totalAmount ??
            Math.round((order?.total || 0) * 100),
        );
        await this.mailer.sendOrderConfirmation(to, {
          orderId: ctx.orderId,
          amount: amountMinor || 0,
          currency,
          paymentIntentId:
            order?.paymentIntentId || order?.payment?.transactionId,
          created: false,
        });
      } else {
        const sendRaw = (this.mailer as any).sendRaw as
          | ((args: {
              to: string;
              subject: string;
              html: string;
            }) => Promise<void>)
          | undefined;
        if (sendRaw) {
          await sendRaw({
            to,
            subject: `Update for order ${ctx.orderId}`,
            html: this.renderOrderUpdateHtml(ctx),
          });
        } else {
          this.logger.warn('notifyCustomer: no mailer method available');
        }
      }

      this.logger.log(
        `notifyCustomer: mailed ${to} for order ${ctx.orderId} (by=${actor?.uid ?? 'system'})`,
      );
    } catch (e) {
      this.logger.warn(
        `notifyCustomer failed for ${order?.id}: ${(e as Error).message}`,
      );
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
            stripUndefinedDeep({
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

    const payload = stripUndefinedDeep({
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
        stripUndefinedDeep({
          status: 'paid',
          linkedOrderId: orderId,
          shippingAddress: payload.shippingAddress,
          customer: payload.customer,
          updatedAt: nowIso(),
        }),
        { merge: true },
      );

    await this.cleanupOldDrafts(userId, orderId, true);

    // ✅ Decrement stock ONCE
    await this.decrementStockForOrder(orderId, payload.items || []);

    // ✅ Send receipt (hybrid approach); de-duped via receiptSentAt/receiptSentFor
    await this.sendReceiptIfNeeded(orderId, pi, draft);

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
