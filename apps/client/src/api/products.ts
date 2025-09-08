// src/api/products.ts
import api from './axiosInstance';
import axios from 'axios';
import type { IProduct } from '@common/types';

export type ListProductsParams = {
  q?: string;
  categoryId?: string;
  limit?: number; // page size
  page?: number; // 1-based page index
  priceMin?: number;
  priceMax?: number;
  stockMin?: number;
  stockMax?: number;
  sort?: string; // e.g. "price:asc"
  [key: string]: unknown;
};

export type ProductsResult<T = IProduct> = {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
};

export async function listProducts<T = IProduct>(
  params: ListProductsParams = {},
): Promise<ProductsResult<T>> {
  try {
    const res = await api.get('/products', { params });

    // API may return either an array or { items, total }
    const data = res.data as
      | T[]
      | { items: T[]; total?: number; page?: number; pageSize?: number };

    const headerTotalRaw = (res.headers?.['x-total-count'] ??
      res.headers?.['x-total'] ??
      res.headers?.['x-total-results']) as string | number | undefined;

    const headerTotal = Number(headerTotalRaw);
    const headerTotalIsValid = Number.isFinite(headerTotal);

    if (Array.isArray(data)) {
      const items = data as T[];
      const total = headerTotalIsValid ? headerTotal : items.length;
      return {
        items,
        total,
        page: typeof params.page === 'number' ? params.page : 1,
        pageSize:
          typeof params.limit === 'number' ? params.limit : items.length,
      };
    }

    if (data && Array.isArray((data as any).items)) {
      const items = (data as any).items as T[];
      const total = Number.isFinite(Number((data as any).total))
        ? Number((data as any).total)
        : headerTotalIsValid
          ? headerTotal
          : items.length;

      return {
        items,
        total,
        page:
          Number.isFinite(Number((data as any).page)) &&
          (data as any).page !== undefined
            ? Number((data as any).page)
            : typeof params.page === 'number'
              ? params.page
              : undefined,
        pageSize:
          Number.isFinite(Number((data as any).pageSize)) &&
          (data as any).pageSize !== undefined
            ? Number((data as any).pageSize)
            : typeof params.limit === 'number'
              ? params.limit
              : undefined,
      };
    }

    return { items: [], total: 0, page: 1, pageSize: 0 };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const msg =
        (err.response?.data as any)?.message ??
        err.message ??
        'Failed to load products';
      throw new Error(msg);
    }
    throw err;
  }
}
