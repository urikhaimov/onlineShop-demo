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

export type TOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

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

export type TOrderPayment = {
  method: string;
  status: 'paid' | 'unpaid';
  transactionId?: string; // Stripe PI id is also here
  currency?: CurrencyCode; // optional currency stored with payment
  receipt_email?: string; // if you decide to persist it
};

export type TOrderAddress = {
  fullName?: string;
  phone?: string;
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

  /** MINOR units (e.g., agorot/cents) – the true source-of-truth total */
  totalAmount: number;

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
    status: string;
    timestamp: string; // ISO string; keep as string if that’s what you store
    changedBy: string;
  }>;

  /** Top-level timestamps exist on the document – include them */
  createdAt?: Timestamp | FirestoreDate;
  updatedAt?: Timestamp | FirestoreDate;

  metadata: OrderMetadata;
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
