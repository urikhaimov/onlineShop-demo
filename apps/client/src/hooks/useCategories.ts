// src/hooks/useCategories.ts
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

type CategoriesResult = { items: Category[]; total: number };

export type ListParams = {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string; // e.g. 'name:asc'
};

type QueryOptions = { enabled?: boolean };

/** Safe normalizer that accepts either {items,total} or a plain array */
function normalizeCategories(data: unknown): CategoriesResult {
  if (Array.isArray(data)) {
    return { items: data as Category[], total: (data as Category[]).length };
  }
  const any = data as Partial<CategoriesResult> | undefined;
  const items = Array.isArray(any?.items) ? (any!.items as Category[]) : [];
  const total =
    typeof any?.total === 'number'
      ? any.total
      : Array.isArray(any?.items)
        ? any!.items!.length
        : 0;
  return { items, total };
}

/** Build a stable query key part from params (prevents ref churn). */
const paramsKey = (p?: ListParams) => JSON.stringify(p ?? {});

/** Default server params for categories (no `order`, we sort by `name`) */
const baseParams: Required<Pick<ListParams, 'limit' | 'sort'>> = {
  limit: 500,
  sort: 'name:asc',
};

// ───────────────────────────────────────────────────────────────────────────────
// Queries
// ───────────────────────────────────────────────────────────────────────────────

/** Fetch categories; accepts server params but returns just the items array for drop-in use. */
export const useCategories = (params?: ListParams, options?: QueryOptions) =>
  useQuery<Category[]>({
    queryKey: ['categories', paramsKey(params)],
    queryFn: async () => {
      const res = await api.get('/categories', {
        params: { ...baseParams, ...(params ?? {}) },
      });
      return normalizeCategories(res.data).items;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
      const res = await api.get('/categories', {
        params: { ...baseParams, ...(params ?? {}) },
      });
      return normalizeCategories(res.data);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });

export const useCategoryById = (id?: string, options?: QueryOptions) =>
  useQuery<Category>({
    queryKey: ['category', id ?? ''],
    enabled: !!id && (options?.enabled ?? true),
    queryFn: async () => {
      const res = await api.get(`/categories/${id}`);
      return res.data as Category;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
    // optimistic remove from ALL cached lists
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'], exact: false });
      const snapshots: Array<{ key: readonly unknown[]; prev: unknown }> = [];

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

      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots?.forEach(({ key, prev }) => qc.setQueryData(key, prev));
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'], exact: false });
    },
  });
};

export function useUpdateCategory() {
  // Optimistic inline rename across the base list;
  // server response body is not used, so we only need to refetch afterwards.
  return useOptimisticMutation<{ id: string; name: string }, Category>({
    mutationFn: async ({ id, name }) => {
      await api.put(`/categories/${id}`, { name });
    },
    queryKey: ['categories'],
    getItemId: (item) => item.id,
    getOptimisticUpdate: (item, { name }) => ({ ...item, name }),
    successMessage: 'Category updated',
    errorMessage: 'Failed to update category',
  });
}
