// src/api/orderApi.ts
import { TOrder as Order } from '@common/types';
import api from './axiosInstance';

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
  const items = Array.isArray(any?.items) ? (any!.items as Order[]) : [];
  const total =
    typeof any?.total === 'number'
      ? any!.total
      : Array.isArray(any?.items)
        ? any!.items!.length
        : 0;
  return { items, total };
}

/** GET /orders/mine with server-side filters & pagination (graceful fallback). */
export async function listMyOrders(
  paramsIn: Partial<MyOrdersParams> & Record<string, unknown>,
): Promise<OrdersResult> {
  // ---- coalesce search keys + sanitize
  const rawQ =
    (paramsIn as any).q ??
    (paramsIn as any).search ??
    (paramsIn as any).query ??
    (paramsIn as any).searchTerm;

  const q =
    typeof rawQ === 'string' && rawQ.trim().length > 0
      ? rawQ.trim()
      : undefined;

  // ---- dates: allow aliases "from"/"to"
  const startDate =
    (paramsIn.startDate as string | undefined) ??
    ((paramsIn as any).from as string | undefined);
  const endDate =
    (paramsIn.endDate as string | undefined) ??
    ((paramsIn as any).to as string | undefined);

  // ---- numbers: only include when finite
  const n = (v: unknown): number | undefined => {
    const num = typeof v === 'string' ? Number(v) : (v as number);
    return Number.isFinite(num) ? num : undefined;
  };

  const totalMin = n(
    (paramsIn.totalMin as number | string | undefined) ??
      ((paramsIn as any).minTotal as number | string | undefined),
  );
  const totalMax = n(
    (paramsIn.totalMax as number | string | undefined) ??
      ((paramsIn as any).maxTotal as number | string | undefined),
  );

  const page = n(paramsIn.page) ?? 1;
  const limit = n(paramsIn.limit) ?? 10;

  const status =
    typeof paramsIn.status === 'string' && paramsIn.status.trim()
      ? paramsIn.status
      : undefined;

  const sort =
    typeof paramsIn.sort === 'string' && paramsIn.sort.trim()
      ? paramsIn.sort
      : undefined;

  const res = await api.get('/orders/mine', {
    params: {
      page,
      limit,
      q, // 👈 full search string (what the test asserts)
      status,
      startDate,
      endDate,
      totalMin,
      totalMax,
      sort,
    },
  });

  const base = normalizeOrders(res.data);
  const headerTotal = Number((res as any).headers?.['x-total-count']);
  const total =
    Number.isFinite(headerTotal) && headerTotal >= 0 ? headerTotal : base.total;

  return { items: base.items, total };
}

// (Optional) DX alias for older imports
export type ListMyOrdersParams = MyOrdersParams;
