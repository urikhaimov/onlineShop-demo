// src/types/order.ts
import { Timestamp } from 'firebase/firestore';
import { IMetadata } from './common.type';

export type FirestoreDate =
  | Date
  | string
  | { toDate?: () => Date }
  | { seconds: number; nanoseconds?: number };

export type CurrencyCode =
  | 'ILS'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'CHF'
  | 'SEK'
  | 'DKK'
  | 'NOK'
  | 'JPY'
  | 'HUF'
  | 'IDR'
  | 'KRW'
  | 'VND'
  | string;

/**
 * Frontend order status (document-level). We keep legacy values and
 * add the new ones the server uses ("open", "paid", "refunded", "canceled").
 */
export type TOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'open'
  | 'paid'
  | 'refunded'
  | 'canceled';

export type OrderMetadata = IMetadata & {
  createdBy: { uid: number; name: string };
  updatedBy: { uid: number; name: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type TOrderItem = {
  productId: string;
  name: string;
  quantity: number;
  /** Unit price in MAJOR units (e.g., ₪) */
  price: number;
  /** Optional – not every item has an image */
  image?: string;
};

/**
 * Stripe PaymentIntent status union (subset; keep string fallback
 * to stay resilient to SDK updates).
 */
export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded'
  | string;

export type TOrderPayment = {
  /** e.g. 'card' */
  method: string;

  /**
   * For compatibility with existing UI, you can still infer "paid"/"unpaid"
   * from this Stripe status:
   *   paid   := status === 'succeeded'
   *   unpaid := otherwise
   */
  status: StripePaymentIntentStatus;

  /** Stripe PaymentIntent id (often equals order id) */
  transactionId?: string;

  /** Optional currency stored with payment */
  currency?: CurrencyCode;

  /** Email used for Stripe receipt (if set) */
  receipt_email?: string;

  /** Backend extras written by OrdersService (optional) */
  provider?: 'stripe' | string;
  totalMinor?: number; // cents/agorot
  totalMajor?: number; // major units mirror
};

/**
 * Address as written by the backend:
 * - Supports both a nested "address" object and flat fields for legacy UIs.
 */
export type TOrderAddress = {
  // nested form (current backend)
  name?: string;
  phone?: string;
  address?: {
    line1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };

  // flat form (legacy UI)
  fullName?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

export type TOrder = {
  id: string;
  userId: string;

  /** Email used for receipt/customer – may be null in DB */
  email?: string | null;

  /** Optional convenience mirror (MAJOR). Prefer totalAmount (MINOR). */
  total?: number;

  /** MINOR units (e.g., agorot/cents) – true source of truth */
  totalAmount?: number;

  /** (Optional) currency for this order */
  currency?: CurrencyCode;

  /** Stripe PaymentIntent id (we use it as doc id for webhook-created orders) */
  paymentIntentId?: string;

  status: TOrderStatus;

  items: TOrderItem[];

  payment: TOrderPayment;

  ownerName?: string | null;
  passportId?: string | null;

  /** Address can be partially filled or absent */
  shippingAddress?: TOrderAddress;

  /** Optional delivery block */
  delivery?: {
    provider?: string;
    trackingNumber?: string;
    eta?: FirestoreDate | string;
  };

  notes?: string | null;

  statusHistory?: Array<{
    status: string; // keep string for flexibility
    timestamp: string; // ISO
    changedBy: string;
  }>;

  /** Top-level timestamps exist on the document – include them */
  createdAt?: Timestamp | FirestoreDate;
  updatedAt?: Timestamp | FirestoreDate;

  /** Some orders might not carry metadata, so keep it optional */
  metadata?: OrderMetadata;
};

export enum ESTATUS_OPTIONS {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export type TOrderSettings = {
  shipping: number; // MAJOR
  taxRate: number; // percent (e.g., 17)
  discount: number; // MAJOR
  currency?: CurrencyCode;
  updatedAt?: Timestamp;
  updatedBy?: { uid: string; name?: string };
};
