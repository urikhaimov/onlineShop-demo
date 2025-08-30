// src/hooks/useProductMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct, deleteProduct, updateProduct } from './useProducts';
import axios from 'axios';

import { cLogger } from '@client/logger';
import { IProduct, TUpdateProduct } from '@common/types';

interface ReorderPayload {
  orderList: { id: string; order: number }[];
  token: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const useProductMutations = () => {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (newProduct: IProduct) => createProduct(newProduct),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('❌ Create product failed:', error);
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
      keepImageUrls,
      newImageFiles,
    }: TUpdateProduct & { id: string }) =>
      updateProduct(id, { data, keepImageUrls, newImageFiles }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      console.error('❌ Update product failed:', error);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      cLogger.error('❌ Delete product failed:', error);
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ orderList, token }: ReorderPayload) => {
      try {
        const url = `${API_BASE}/api/products/reorder`;
        const body = { orderList };

        const res = await axios.put(url, body, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return res.data;
      } catch (err: any) {
        cLogger.error('❌ Reorder products failed:', err);
        // dump debug info
        cLogger.error('❌ Reorder debug info:', {
          apiBase: API_BASE || '(empty)',
          url: `${API_BASE}/api/products/reorder`,
          method: 'PUT',
          body: JSON.stringify({ orderList }),
          status: err?.response?.status,
          data: err?.response?.data,
        });
        throw err;
      }
    },
    // Do not invalidate immediately to avoid snap-back,
    // you’re already optimistically updating in AdminProductsPage
    onError: (error) => {
      cLogger.error('❌ Reorder mutation failed:', error);
    },
  });

  return {
    create,
    update,
    remove,
    reorder,
  };
};
