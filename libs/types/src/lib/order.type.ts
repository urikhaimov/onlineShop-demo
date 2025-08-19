// src/types/order.ts
import { IMetadata } from './common.type';
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

export type TOrder = {
  id: string;
  userId: string;
  ownerName?: string;
  email?: string; // ✅ Add this
  total?: number; // ✅ Add this
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  amount: number; // ✅ Add this
  status: TOrderStatus;
  payment: {
    method: string;
    status: 'paid' | 'unpaid';
    transactionId?: string;
  };
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
  createdAt?: FirestoreDate; // 👈 add
  updatedAt?: FirestoreDate; // 👈 add
  metadata?: IMetadata & {
    createdAt?: FirestoreDate;
    updatedAt?: FirestoreDate;
  };
};
