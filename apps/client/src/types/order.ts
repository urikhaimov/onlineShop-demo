// src/types/order.ts
import { Timestamp } from 'firebase/firestore';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
export type Order = {
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
  status: OrderStatus;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
