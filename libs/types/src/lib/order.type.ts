// src/types/order.ts
import { IMetadata } from './common.type';
import { Timestamp } from 'firebase/firestore';
export type FirestoreDate =
  | Date
  | string
  | { toDate?: () => Date }
  | { seconds: number; nanoseconds?: number };

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

export type TOrder = {
  id: string;
  userId: string;

  email?: string; // ✅ Add this
  total?: number; // ✅ Add this
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  totalAmount: number; // ✅ Add this
  status: TOrderStatus;
  payment: {
    method: string;
    status: 'paid' | 'unpaid';
    transactionId?: string;
  };
  ownerName?: string;
  passportId?: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  delivery: {
    provider?: string;
    trackingNumber?: string;
    eta?: string;
  };
  notes?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    changedBy: string;
  }>;
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
  shipping: number;
  taxRate: number;
  discount: number;
  updatedAt?: Timestamp;
  updatedBy?: { uid: string; name?: string };
};
