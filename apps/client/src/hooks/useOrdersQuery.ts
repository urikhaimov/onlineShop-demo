import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import api from '../api/axiosInstance';
import type { TOrder } from '@common/types';

export type ListOrdersParams = {
  q?: string; // email / free text
  status?: string; // 'paid' | 'pending' | 'cancelled' | 'all' (omit 'all')
  totalMin?: number;
  totalMax?: number;
  priceMin?: number; // filter by any line-item price in range
  priceMax?: number;
  startDate?: string; // ISO string (date-only or full)
  endDate?: string; // ISO string
  inStockOnly?: boolean; // any item with quantity>0
  limit?: number;
  page?: number;
  sort?: string; // e.g. "createdAt:desc"
};

type OrdersResult = { items: TOrder[]; total: number };

type QueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | 'always';
  refetchOnWindowFocus?: boolean;
};

/** treat '', null, undefined, 'undefined', 'null' as "empty" */
const isBlank = (v: unknown) =>
  v === '' || v === null || v === 'undefined' || v === 'null';

const toNum = (v: unknown) => {
  if (isBlank(v)) return undefined;
  const m = String(v).match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
};

/** remove only keys that are actually undefined (keep 0, false, etc) */
const pruneUndefined = <T extends Record<string, any>>(obj: T): T =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;

function normalizeFilters(raw: Record<string, any>): ListOrdersParams {
  const out: ListOrdersParams = {
    q: isBlank(raw.q) ? undefined : String(raw.q),
    status:
      isBlank(raw.status) || raw.status === 'all'
        ? undefined
        : String(raw.status),
    limit: toNum(raw.limit) ?? 20,
    page: toNum(raw.page) ?? 1,
    totalMin: toNum(raw.totalMin),
    totalMax: toNum(raw.totalMax),
    priceMin: toNum(raw.priceMin),
    priceMax: toNum(raw.priceMax),
    startDate: isBlank(raw.startDate) ? undefined : String(raw.startDate),
    endDate: isBlank(raw.endDate) ? undefined : String(raw.endDate),
    inStockOnly:
      typeof raw.inStockOnly === 'string'
        ? raw.inStockOnly === 'true' || raw.inStockOnly === '1' || undefined
        : (Boolean(raw.inStockOnly) as boolean) || undefined,
    sort: isBlank(raw.sort) ? undefined : String(raw.sort),
  };
  return pruneUndefined(out);
}

function normalizeOrders(data: unknown): OrdersResult {
  if (Array.isArray(data)) {
    const items = data as TOrder[];
    return { items, total: items.length };
  }
  const any = data as Partial<OrdersResult> | undefined;
  return {
    items: Array.isArray(any?.items) ? (any!.items as TOrder[]) : [],
    total:
      typeof any?.total === 'number'
        ? any!.total
        : Array.isArray(any?.items)
          ? any!.items!.length
          : 0,
  };
}

/** Which endpoint to try first (customize to your API). */
const ORDERS_PATH =
  (import.meta as any).env?.VITE_ORDERS_PATH || '/admin/orders';

/** Fetch orders from the API (Auth header handled by axiosInstance). */
async function listOrders(params: ListOrdersParams): Promise<OrdersResult> {
  // Try configured path first, then alternate fallback (admin <-> public)
  const paths =
    ORDERS_PATH === '/admin/orders'
      ? ['/admin/orders', '/orders']
      : ['/orders', '/admin/orders'];

  for (const p of paths) {
    try {
      const res = await api.get(p, {
        // Axios omits undefined values from query automatically
        params,
      });

      // Prefer body {items,total}, but respect X-Total-Count header if present
      const base = normalizeOrders(res.data);
      const headerTotal = Number(res.headers?.['x-total-count']);
      const total =
        Number.isFinite(headerTotal) && headerTotal >= 0
          ? headerTotal
          : base.total;

      return { items: base.items, total };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        continue; // try next path
      }
      throw err;
    }
  }

  // Both paths 404 → empty
  return { items: [], total: 0 };
}

/** Main hook */
export function useOrdersQuery(
  rawFilters: Record<string, any>,
  options?: QueryOptions,
) {
  const params = useMemo(() => normalizeFilters(rawFilters), [rawFilters]);

  return useQuery<OrdersResult>({
    queryKey: ['orders', params],
    queryFn: () => {
      if (import.meta.env.DEV) {
        console.log('listOrders -> params', params);
      }
      return listOrders(params);
    },
    staleTime: options?.staleTime ?? 30_000,
    refetchOnMount: options?.refetchOnMount ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
