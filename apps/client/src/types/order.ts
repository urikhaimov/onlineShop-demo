// src/types/order.ts
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
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
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
  createdAt: string;
  updatedAt: string;
};
