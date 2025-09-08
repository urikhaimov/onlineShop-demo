// src/hooks/useProductsQuery.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProducts, type ListProductsParams } from '../api/products';

const toNum = (v: unknown) => {
  if (v === '' || v === null) return undefined;
  const m = String(v).match(/-?\d+(\.\d+)?/); // strips “₪”, “kp”, etc.
  return m ? Number(m[0]) : undefined;
};

function normalize(raw: Record<string, any>): ListProductsParams {
  return {
    q: raw.q ?? undefined,
    categoryId: raw.categoryId ?? undefined,
    limit: toNum(raw.limit) ?? 20,
    page: toNum(raw.page) ?? 1,
    priceMin: toNum(raw.priceMin),
    priceMax: toNum(raw.priceMax),
    stockMin: toNum(raw.stockMin),
    stockMax: toNum(raw.stockMax),
    sort: raw.sort ?? undefined,
  };
}

export function useProductsQuery(rawFilters: Record<string, any>) {
  const params = useMemo(() => normalize(rawFilters), [rawFilters]);

  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      // Debug: you should see this in the console when page loads
      console.log('listProducts -> params', params);
      return listProducts(params);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
