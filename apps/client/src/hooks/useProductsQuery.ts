// src/hooks/useProductsQuery.ts
import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import api from '../api/axiosInstance';
import type { IProduct } from '@common/types';

export type ListProductsParams = {
  q?: string;
  categoryId?: string;
  priceMin?: number;
  priceMax?: number;
  stockMin?: number;
  stockMax?: number;
  limit?: number;
  page?: number;
  sort?: string; // e.g. "order:asc" or "updatedAt:desc"
};

type ProductsResult = { items: IProduct[]; total: number };

type QueryOptions = {
  enabled?: boolean;
  /** Override default 30s freshness */
  staleTime?: number;
  /** Force a refetch when the component mounts */
  refetchOnMount?: boolean | 'always';
  /** Disable/enable refetch on window focus (default false here) */
  refetchOnWindowFocus?: boolean;
};

/** treat '', null, undefined, 'undefined', 'null' as "empty" */
const isBlank = (v: unknown) =>
  v === '' ||
  v === null ||
  v === undefined ||
  v === 'undefined' ||
  v === 'null';

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

function normalizeFilters(raw: Record<string, any>): ListProductsParams {
  const out: ListProductsParams = {
    q: isBlank(raw.q) ? undefined : String(raw.q),
    categoryId: isBlank(raw.categoryId) ? undefined : String(raw.categoryId),
    limit: toNum(raw.limit) ?? 20,
    page: toNum(raw.page) ?? 1,
    priceMin: toNum(raw.priceMin),
    priceMax: toNum(raw.priceMax),
    stockMin: toNum(raw.stockMin),
    stockMax: toNum(raw.stockMax),
    sort: isBlank(raw.sort) ? undefined : String(raw.sort),
  };
  return pruneUndefined(out);
}

function normalizeProducts(data: unknown): ProductsResult {
  if (Array.isArray(data)) {
    const items = data as IProduct[];
    return { items, total: items.length };
  }
  const any = data as Partial<ProductsResult> | undefined;
  return {
    items: Array.isArray(any?.items) ? (any!.items as IProduct[]) : [],
    total:
      typeof any?.total === 'number'
        ? any!.total
        : Array.isArray(any?.items)
          ? any!.items!.length
          : 0,
  };
}

/** Which endpoint to try first (can be overridden in env). */
const PRODUCTS_PATH =
  (import.meta.env.VITE_PRODUCTS_PATH as string) || '/products/public';

/** Fetch products from the API (Auth header handled by axiosInstance). */
async function listProducts(
  params: ListProductsParams,
): Promise<ProductsResult> {
  // Try configured path first, then fall back to the alternate one if it's a 404.
  const paths =
    PRODUCTS_PATH === '/products/public'
      ? ['/products/public', '/products']
      : ['/products', '/products/public'];

  for (const p of paths) {
    try {
      const res = await api.get(p, { params });

      // Prefer body {items,total}, but respect X-Total-Count header if present
      const base = normalizeProducts(res.data);
      const headerTotal = Number(res.headers?.['x-total-count']);
      const total =
        Number.isFinite(headerTotal) && headerTotal >= 0
          ? headerTotal
          : base.total;

      return { items: base.items, total };
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        continue; // try the next path
      }
      throw err; // other errors should surface
    }
  }

  // If both paths 404, return empty (UI can show "no products")
  return { items: [], total: 0 };
}

/** Main hook */
export function useProductsQuery(
  rawFilters: Record<string, any>,
  options?: QueryOptions,
) {
  const params = useMemo(() => normalizeFilters(rawFilters), [rawFilters]);

  return useQuery<ProductsResult>({
    queryKey: ['products', params],
    queryFn: () => {
      if (import.meta.env.DEV) {
        console.log('listProducts -> params', params);
      }
      return listProducts(params);
    },
    staleTime: options?.staleTime ?? 30_000,
    refetchOnMount: options?.refetchOnMount ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}
