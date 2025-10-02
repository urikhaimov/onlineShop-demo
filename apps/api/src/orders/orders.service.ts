import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { adminDb } from '@common/firebase';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { MailerService } from '../mailer/mailer.service';
import { InvoiceService } from '../invoice/invoice.service';

type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

function nowIso() {
  return new Date().toISOString();
}

// ───────────────────────────────── helpers ─────────────────────────────────
function buildIdemKey(params: {
  provided?: string | undefined;
  userId: string;
  orderId?: string | undefined;
  amount: number;
  currency: string;
}) {
  const fallback = `pi:${params.orderId ?? 'no-order'}:${params.currency}:${params.amount}`;
  const base = (params.provided?.trim() || fallback).trim();
  const tagged = `${base}:${params.userId || 'anon'}`;
  return tagged.length > 255 ? tagged.slice(0, 255) : tagged;
}

function isIdempotencyParamMismatch(e: any): boolean {
  const msg =
    (Array.isArray(e?.raw?.message)
      ? e.raw.message.join(', ')
      : e?.raw?.message) ||
    e?.message ||
    '';
  return /idempotent/i.test(msg) && /same parameters/i.test(msg);
}

function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

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

// money & tax helpers
const toMinor = (v: any) => Math.max(0, Math.round((Number(v) || 0) * 100));
const normalizeRate = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n : n / 100; // accepts 0.17 or 17 → 0.17
};

// env toggles
const VAT_APPLIES_TO_SHIPPING =
  String(process.env.VAT_APPLIES_TO_SHIPPING ?? '1') !== '0';
const DISCOUNT_BEFORE_TAX =
  String(process.env.DISCOUNT_BEFORE_TAX ?? '1') !== '0';

// ───────────────────────────────── service ─────────────────────────────────
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  public readonly stripe?: Stripe;

  /** Feature flag: if true, OrdersService sends Stripe receipts; otherwise controllers/webhooks do it. */
  private readonly sendStripeEmailsFromOrders: boolean;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly invoice?: InvoiceService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (!key && process.env.NODE_ENV === 'test') {
      this.stripe = new Stripe('sk_test_dummy', {
        apiVersion: '2024-06-20' as any,
      });
      this.logger.verbose('OrdersService: using dummy Stripe key in tests');
    } else {
      if (!key) throw new Error('Missing STRIPE_SECRET_KEY in environment');
      this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as any });
    }

    // Default OFF: avoid double-send; controllers/webhooks handle mailing and stamping.
    this.sendStripeEmailsFromOrders =
      String(process.env.SEND_STRIPE_EMAILS_FROM_ORDERS || '').toLowerCase() ===
      'true';
  }

  private col() {
    return adminDb.collection('orders');
  }
  private productsCol() {
    return adminDb.collection('products');
  }

  // ───────────────────────── settings & subtotal helpers ─────────────────────────
  private async loadOrderSettings() {
    const snap = await adminDb
      .collection('order-settings')
      .doc('default')
      .get();
    const d = (snap.exists ? snap.data() : {}) as any;
    return {
      shippingMinor: toMinor(d?.shipping),
      discountMinor: toMinor(d?.discount),
      vatRate: normalizeRate(d?.taxRate), // fraction, e.g., 0.17
    };
  }

  private async subtotalFromCart(cart?: any[]): Promise<number> {
    if (!Array.isArray(cart) || cart.length === 0) return 0;
    let subtotal = 0;
    for (const it of cart) {
      const id = String(it.productId ?? it.id ?? '').trim();
      const qty = Math.max(0, Number(it.quantity ?? it.qty ?? 1) || 0);
      if (!id || qty <= 0) continue;
      const snap = await this.productsCol().doc(id).get();
      // prefer server price; fallback to client-provided major price
      const unitMajor =
        Number(snap.get('price')) || Number(it.priceMajor || it.price) || 0;
      if (unitMajor > 0 && qty > 0) {
        subtotal += toMinor(unitMajor) * qty;
      }
    }
    return subtotal;
  }

  // ───────────────────────── stock ─────────────────────────
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

      // PHASE A: reads first
      const orderSnap = await tx.get(orderRef);
      const already = orderSnap.exists && orderSnap.get('stockDecrementedAt');
      if (already) return { updated: 0, skipped: 0, errors: 0, already: true };

      const productRefs = productIds.map((id) => this.productsCol().doc(id));
      const snaps: DocumentSnapshot[] = await Promise.all(
        productRefs.map((r) => tx.get(r)),
      );

      // PHASE B: writes
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

  // For manual/admin-paid orders
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

  // ───────────────────────── queries ─────────────────────────
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

  // ───────────────────────── mutations ─────────────────────────
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

    if (prevStatus !== 'paid' && nextStatus === 'paid') {
      await this.decrementStockForOrder(id, after.items || []);
      await this.sendManualReceiptIfNeeded(after);
    }

    // 📨 NEW: notify customer when status / delivery / shippingAddress was provided
    const shouldNotify =
      Object.prototype.hasOwnProperty.call(dto, 'status') ||
      Object.prototype.hasOwnProperty.call(dto, 'delivery') ||
      Object.prototype.hasOwnProperty.call(dto, 'shippingAddress');

    if (shouldNotify) {
      await this.notifyCustomer(after, dto);
    }

    return after;
  }

  async updateStatus(orderId: string, status: OrderStatus) {
    const ref = this.col().doc(orderId);
    const before = await ref.get();
    const prevStatus: OrderStatus = (before.data() as any)?.status;

    await ref.set({ status, updatedAt: nowIso() }, { merge: true });
    this.logger.log(`Order ${orderId} → ${status}`);

    if (prevStatus !== 'paid' && status === 'paid') {
      const afterSnap = await ref.get();
      const order = { id: orderId, ...(afterSnap.data() as any) };
      await this.decrementStockForOrder(orderId, order.items || []);
      // (optional) you can notify here if you want: await this.notifyCustomer(order, { status });
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

  // ───────────────────────── drafts ─────────────────────────
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

  // ───────────────────────── cleanup ─────────────────────────
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
          this.logger.verbose(
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

  // ───────────────────────── Stripe: create/confirm ─────────────────────────
  async createPaymentIntent(input: {
    totalMajor?: number; // optional (server will compute)
    currency?: string;
    userId: string;
    orderId?: string;
    metadata?: Record<string, string>;
    email?: string;
    idempotencyKey?: string;
    cart?: any[]; // used to compute subtotal
    reuseIfSame?: boolean;
  }) {
    if (!this.stripe) throw new Error('Stripe not configured');

    const currency = (input.currency ?? 'ils').toLowerCase();

    // 1) Subtotal from products (minor units); fallback to provided totalMajor
    const subtotalMinor =
      (await this.subtotalFromCart(input.cart)) || toMinor(input.totalMajor);

    // 2) Load settings from DB and compute totals
    const { shippingMinor, discountMinor, vatRate } =
      await this.loadOrderSettings();

    const vatBase =
      subtotalMinor +
      (VAT_APPLIES_TO_SHIPPING ? shippingMinor : 0) -
      (DISCOUNT_BEFORE_TAX ? discountMinor : 0);
    const vatMinor = Math.round(Math.max(0, vatBase) * vatRate);

    const amountMinor = Math.max(
      0,
      subtotalMinor + shippingMinor - discountMinor + vatMinor,
    );

    // 3) Idempotency key (same as before)
    const baseKey = buildIdemKey({
      provided: input.idempotencyKey,
      userId: input.userId || 'anon',
      orderId: input.orderId,
      amount: amountMinor,
      currency,
    });
    const idemKey =
      input.reuseIfSame === true
        ? baseKey
        : `${baseKey}:${Date.now().toString(36)}:${Math.random()
            .toString(36)
            .slice(2, 7)}`.slice(0, 255);

    // 4) Create PI with a snapshot of settings in metadata
    const params: Stripe.PaymentIntentCreateParams = {
      amount: amountMinor,
      currency,
      payment_method_types: ['card'],
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      metadata: {
        userId: input.userId,
        orderId: input.orderId ?? '',
        app: 'onlineShop',
        ...(input.metadata ?? {}),
        ...(input.email ? { email: input.email } : {}),
        subtotal_minor: String(subtotalMinor),
        shipping_minor: String(shippingMinor),
        discount_minor: String(discountMinor),
        vat_rate: String(vatRate), // fraction (e.g., 0.17)
      },
      receipt_email: input.email || undefined,
    };

    const tryCreate = (idk: string) =>
      this.stripe!.paymentIntents.create(params, { idempotencyKey: idk });

    let pi: Stripe.PaymentIntent;
    try {
      pi = await tryCreate(idemKey);
    } catch (e) {
      if (!isIdempotencyParamMismatch(e)) throw e;
      const salted = `${idemKey}:${Date.now().toString(36)}`.slice(0, 255);
      this.logger.warn(
        `createPaymentIntent retrying with salted key due to idempotency mismatch (was=${idemKey})`,
      );
      pi = await tryCreate(salted);
    }

    // 5) Persist draft (also store the snapshot)
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
          // snapshots used later by invoice:
          subtotalMinor,
          shippingMinor,
          discountMinor,
          vatRate,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          _idempotencyKeyUsed: idemKey,
        }),
        { merge: true },
      );

    this.logger.log(`createPaymentIntent ${pi.id} ${currency} ${amountMinor}`);
    await this.cleanupOldDrafts(input.userId, pi.id, false);

    return { clientSecret: pi.client_secret, paymentIntentId: pi.id };
  }

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

    if (customer || shippingAddress) {
      await this.saveDraftCheckoutDetails({
        paymentIntentId,
        userId,
        customer,
        shippingAddress,
        updateStripePI: mirrorToStripe,
      });
    }

    let pi = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });

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

    pi = await this.stripe.paymentIntents.confirm(
      paymentIntentId,
      defined({ payment_method: paymentMethodId, return_url: returnUrl }),
    );

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

  // ───────────────────────── email helpers ─────────────────────────
  private async getRecipientEmail(opts: {
    pi: Stripe.PaymentIntent;
    draft?: any;
  }) {
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
    return `<p>Hi,</p><p>Your order <b>${ctx.orderId}</b> was updated.</p><p>${lines.join('<br/>')}</p>`;
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

      // ⛔ If we ever stamped a receipt, skip (controllers/webhooks may have mailed it)
      if (alreadyAt) {
        this.logger.log(
          `receipt already stamped for ${orderId} @ ${alreadyAt}${
            alreadyFor ? ` (for=${alreadyFor})` : ''
          }`,
        );
        return;
      }

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
        { receiptSentAt: nowIso(), receiptSentFor: pi.id, updatedAt: nowIso() },
        { merge: true },
      );

      this.logger.log(`receipt sent for ${orderId} (pi=${pi.id}) → ${to}`);
    } catch (e) {
      this.logger.warn(
        `sendReceiptIfNeeded failed for ${orderId}: ${(e as Error).message}`,
      );
    }
  }

  // ───────────────────────── email helpers ─────────────────────────
  async notifyCustomer(
    order: any,
    patch: any = {},
    actor?: { uid?: string; email?: string } | null,
  ): Promise<void> {
    try {
      if (!this.mailer) return;
      const to = this.getEmailFromOrder(order);
      if (!to) {
        this.logger.warn(`notifyCustomer: no recipient email for ${order?.id}`);
        return;
      }

      // gather values (patch overrides order)
      const orderId = String(order.id || order.paymentIntentId || '');
      const status: string | undefined = (patch?.status ??
        order?.status) as any;

      const delivery = {
        provider: patch?.delivery?.provider ?? order?.delivery?.provider,
        trackingNumber:
          patch?.delivery?.trackingNumber ?? order?.delivery?.trackingNumber,
        eta: patch?.delivery?.eta ?? order?.delivery?.eta,
      };

      const shippingAddress =
        patch?.shippingAddress ?? order?.shippingAddress ?? undefined;

      // pick a locale if you have one on the order; default he for IL
      const locale: 'he' | 'en' =
        (order?.locale as any) ||
        ((order?.shippingAddress?.address?.country || '').toUpperCase() === 'IL'
          ? 'he'
          : 'en');

      // ✅ send with the structure MailerService expects
      if (typeof (this.mailer as any)?.sendOrderUpdate === 'function') {
        await (this.mailer as any).sendOrderUpdate.call(
          this.mailer,
          to,
          { orderId, status, delivery, shippingAddress, locale },
          undefined,
        );
      } else if (this.mailer.sendOrderConfirmation) {
        // fallback: resend a simple receipt-style email
        const currency = (order?.currency || order?.payment?.currency || 'ILS')
          .toString()
          .toUpperCase();
        const amountMinor = Number(
          order?.totalMinor ??
            order?.totalAmount ??
            Math.round((order?.total || 0) * 100),
        );
        await this.mailer.sendOrderConfirmation(to, {
          orderId,
          amount: amountMinor || 0,
          currency,
          paymentIntentId:
            order?.paymentIntentId || order?.payment?.transactionId || orderId,
          created: false,
          locale,
        });
      } else {
        this.logger.warn('notifyCustomer: no mailer method available');
      }

      this.logger.log(
        `notifyCustomer: mailed ${to} for order ${orderId} (by=${actor?.uid ?? 'system'})`,
      );
    } catch (e) {
      this.logger.warn(
        `notifyCustomer failed for ${order?.id}: ${(e as Error).message}`,
      );
    }
  }

  // ───────────────────────── Stripe: create order ─────────────────────────
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

    // snapshots for invoice
    const m = pi.metadata || {};
    const subtotalMinor =
      Number(m.subtotal_minor) || Number(draft?.subtotalMinor) || undefined;
    const shippingMinor =
      Number(m.shipping_minor) || Number(draft?.shippingMinor) || 0;
    const discountMinor =
      Number(m.discount_minor) || Number(draft?.discountMinor) || 0;
    const vatRate =
      m.vat_rate !== null
        ? Number(m.vat_rate)
        : typeof draft?.vatRate === 'number'
          ? Number(draft.vatRate)
          : undefined;

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
      // NEW snapshots → for invoice generation
      subtotalMinor,
      shippingMinor,
      discountMinor,
      vatRate,
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

    await this.decrementStockForOrder(orderId, payload.items || []);

    // ✅ Only send from OrdersService if explicitly enabled to avoid double-send.
    if (this.sendStripeEmailsFromOrders) {
      await this.sendReceiptIfNeeded(orderId, pi, draft);
    }

    this.logger.log(`createOrderFromIntentById ${orderId} ← ${pi.status}`);
    return payload;
  }

  // ───────────────────────── webhooks ─────────────────────────
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

  // ───────────────────────── tests helper ─────────────────────────
  async findMostRecentOpenOrderId(): Promise<string | null> {
    const snap = await this.col()
      .where('status', '==', 'open')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    return snap.empty ? null : snap.docs[0].id;
  }
}
