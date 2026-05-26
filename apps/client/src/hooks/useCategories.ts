import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import api from '../api/axiosInstance';
import { useOptimisticMutation } from './useOptimisticMutation';
import type { TCategory as Category } from '@common/types';
import { isDemoAdmin } from '../lib/demo-mode';

const CATEGORIES_ENDPOINT = isDemoAdmin()
  ? '/categories/publiclist'
  : '/categories';

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────

type CategoriesResult = { items: Category[]; total: number };

export type ListParams = {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string; // e.g. 'nameLower:asc'
};

type QueryOptions = {
  enabled?: boolean;
  /** Force a refetch when the component mounts */
  refetchOnMount?: boolean | 'always';
  /** Override default 5m cache freshness if needed */
  staleTime?: number;
};

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Safe normalizer that accepts either `{ items, total }` or a plain array.
 * Also guarantees every item has an `id` (defensive for older APIs/seeds).
 */
function normalizeCategories(data: unknown): CategoriesResult {
  const asArray: any[] = Array.isArray(data)
    ? (data as Category[])
    : Array.isArray((data as any)?.items)
      ? ((data as any).items as Category[])
      : [];

  const items: Category[] = asArray.map((c, i) => {
    const any = c as any;
    const id = c?.id ?? any?.metadata?.id ?? any?.docId ?? `__missing_${i}`;
    return { ...c, id } as Category;
  });

  const total: number =
    typeof (data as any)?.total === 'number'
      ? (data as any).total
      : items.length;

  return { items, total };
}

/** Build a stable query key part from params (prevents ref churn). */
const paramsKey = (p?: ListParams) => JSON.stringify(p ?? {});

/**
 * Default server params for categories.
 * Prefer sorting by a normalized lowercase field when the API supports it
 * (see service: `nameLower`).
 */
const baseParams: Required<Pick<ListParams, 'limit' | 'sort'>> = {
  limit: 500,
  sort: 'name:asc',
};

// ───────────────────────────────────────────────────────────────────────────────
// Queries
// ───────────────────────────────────────────────────────────────────────────────

/** Fetch categories; accepts server params but returns just the items array. */
export const useCategories = (params?: ListParams, options?: QueryOptions) =>
  useQuery<Category[]>({
    queryKey: ['categories', paramsKey(params)],
    queryFn: async () => {
      const res = await api.get(CATEGORIES_ENDPOINT, {
        params: { ...baseParams, ...(params ?? {}) },
      });
      return normalizeCategories(res.data).items;
    },
    staleTime: options?.staleTime ?? 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? false,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

/** Same as useCategories, but returns `{ items, total }` if you need the total. */
export const useCategoriesResult = (
  params?: ListParams,
  options?: QueryOptions,
) =>
  useQuery<CategoriesResult>({
    queryKey: ['categories', 'result', paramsKey(params)],
    queryFn: async () => {
      const res = await api.get(CATEGORIES_ENDPOINT, {
        params: { ...baseParams, ...(params ?? {}) },
      });
      return normalizeCategories(res.data);
    },
    staleTime: options?.staleTime ?? 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? false,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

export const useCategoryById = (id?: string, options?: QueryOptions) =>
  useQuery<Category>({
    queryKey: ['category', id ?? ''],
    enabled: !!id && (options?.enabled ?? true),
    queryFn: async () => {
      const res = await api.get(`/categories/${id}`);
      const one = res.data as Category | undefined;
      // Defensive: ensure id present in detail view too
      if (one && !('id' in one)) {
        (one as any).id = String(id);
      }
      return one as Category;
    },
    staleTime: options?.staleTime ?? 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: options?.refetchOnMount ?? false,
    placeholderData: keepPreviousData,
  });

// ───────────────────────────────────────────────────────────────────────────────
// Mutations
// ───────────────────────────────────────────────────────────────────────────────

export const useAddCategory = () => {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/categories', { name });
      return res.data as Category;
    },
    onSuccess: async () => {
      enqueueSnackbar('Category added', { variant: 'success' });
      // Invalidate every categories query (all param variants)
      await qc.invalidateQueries({ queryKey: ['categories'], exact: false });
      await qc.invalidateQueries({
        queryKey: ['categories', 'result'],
        exact: false,
      });
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ??
        error?.message ??
        'Failed to add category';
      enqueueSnackbar(message, { variant: 'error' });
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    // Optimistic remove from ALL cached lists
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'], exact: false });
      await qc.cancelQueries({
        queryKey: ['categories', 'result'],
        exact: false,
      });

      const snapshots: Array<{ key: readonly unknown[]; prev: unknown }> = [];

      // Update simple lists (items only)
      qc.getQueriesData<Category[]>({ queryKey: ['categories'] }).forEach(
        ([key, prev]) => {
          if (Array.isArray(prev)) {
            snapshots.push({ key, prev });
            qc.setQueryData<Category[]>(
              key,
              prev.filter((c) => c.id !== id),
            );
          }
        },
      );

      // Update { items, total } lists
      qc.getQueriesData<CategoriesResult>({
        queryKey: ['categories', 'result'],
      }).forEach(([key, prev]) => {
        if (prev && Array.isArray(prev.items)) {
          snapshots.push({ key, prev });
          const items = prev.items.filter((c) => c.id !== id);
          const total =
            typeof prev.total === 'number'
              ? Math.max(0, prev.total - 1)
              : items.length;
          qc.setQueryData<CategoriesResult>(key, { items, total });
        }
      });

      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots?.forEach(({ key, prev }) => qc.setQueryData(key, prev));
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'], exact: false });
      await qc.invalidateQueries({
        queryKey: ['categories', 'result'],
        exact: false,
      });
    },
  });
};

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await api.put(`/categories/${id}`, { name });
    },
    onSuccess: async () => {
      enqueueSnackbar('Category updated', { variant: 'success' });
      await qc.invalidateQueries({ queryKey: ['categories'], exact: false });
      await qc.invalidateQueries({
        queryKey: ['categories', 'result'],
        exact: false,
      });
    },
    onError: () => {
      enqueueSnackbar('Failed to update category', { variant: 'error' });
    },
  });
}
