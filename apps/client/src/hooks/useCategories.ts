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
  sort?: string;
};
type QueryOptions = { enabled?: boolean };

function normalizeCategories(data: unknown): CategoriesResult {
  if (Array.isArray(data))
    return { items: data as Category[], total: (data as Category[]).length };
  const any = data as Partial<CategoriesResult> | undefined;
  return {
    items: Array.isArray(any?.items) ? (any!.items as Category[]) : [],
    total: Number.isFinite(Number(any?.total))
      ? Number(any!.total)
      : (any?.items?.length ?? 0),
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Queries
// ───────────────────────────────────────────────────────────────────────────────

/** Fetch categories; accepts server params but returns just the items array for drop-in use. */
export const useCategories = (params?: ListParams, options?: QueryOptions) =>
  useQuery<Category[]>({
    queryKey: ['categories', params ?? {}],
    queryFn: async () => {
      const res = await api.get('/categories', {
        params: { limit: 500, sort: 'order:asc', ...(params ?? {}) },
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
    queryKey: ['categories', 'result', params ?? {}],
    queryFn: async () => {
      const res = await api.get('/categories', {
        params: { limit: 500, sort: 'order:asc', ...(params ?? {}) },
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
    queryKey: ['category', id],
    enabled: !!id && (options?.enabled ?? true),
    queryFn: async () => {
      const res = await api.get(`/categories/${id}`);
      return res.data as Category;
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    // keep the last category visible while refetching
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
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await qc.invalidateQueries({ queryKey: ['categories', 'result'] });
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
    // optimistic remove from the list
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['categories'] });
      const prev = qc.getQueryData<Category[]>(['categories']);
      if (prev) {
        qc.setQueryData<Category[]>(
          ['categories'],
          prev.filter((c) => c.id !== id),
        );
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['categories'], ctx.prev);
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await qc.invalidateQueries({ queryKey: ['categories', 'result'] });
    },
  });
};

export function useUpdateCategory() {
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
