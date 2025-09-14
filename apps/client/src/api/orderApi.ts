// src/api/orderApi.ts
import { TOrder as Order } from '@common/types';
import api from './axiosInstance'; // ✅ With auth interceptors

/* ───────────────────────────
 * Basic endpoints
 * ─────────────────────────── */
export function fetchMyOrders() {
  return api.get<Order[]>('/orders/mine');
}

export function fetchAllOrders() {
  return api.get<Order[]>('/orders');
}

export function fetchOrderById(id: string) {
  return api.get<Order>(`/orders/${id}`);
}

export function updateOrderById(id: string, data: Partial<Order>) {
  return api.patch<Order>(`/orders/${id}`, data);
}

/* ───────────────────────────
 * Server-filtered, paginated “my orders”
 * Falls back gracefully if API returns an array.
 * ─────────────────────────── */
export type MyOrdersParams = {
  q?: string;
  status?: string;
  startDate?: string; // YYYY-MM-DD or ISO
  endDate?: string; // YYYY-MM-DD or ISO
  totalMin?: number;
  totalMax?: number;
  page?: number; // 1-based
  limit?: number; // page size
  sort?: string; // e.g. "createdAt:desc"
};
export type OrdersResult = { items: Order[]; total: number };

function normalizeOrders(data: unknown): OrdersResult {
  if (Array.isArray(data)) {
    const items = data as Order[];
    return { items, total: items.length };
  }
  const any = data as Partial<OrdersResult> | undefined;
  return {
    items: Array.isArray(any?.items) ? (any!.items as Order[]) : [],
    total:
      typeof any?.total === 'number'
        ? any!.total
        : Array.isArray(any?.items)
          ? any!.items!.length
          : 0,
  };
}

/** GET /orders/mine with server-side filters & pagination (graceful fallback). */
export async function listMyOrders(
  params: MyOrdersParams,
): Promise<OrdersResult> {
  const res = await api.get('/orders/mine', { params });
  const base = normalizeOrders(res.data);
  const headerTotal = Number(res.headers?.['x-total-count']);
  const total =
    Number.isFinite(headerTotal) && headerTotal >= 0 ? headerTotal : base.total;
  return { items: base.items, total };
}

// (Optional) re-export for DX parity with earlier code
export type ListMyOrdersParams = MyOrdersParams;
