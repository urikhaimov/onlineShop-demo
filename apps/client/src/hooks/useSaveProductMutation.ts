// src/hooks/useSaveProductMutation.ts
import { useMutation } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { auth } from '../firebase';
import type { IProduct } from '@common/types';

export type SaveProductArgs = {
  productId?: string;
  mode: 'add' | 'edit';
  data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: string;
  };
  images: { id: string; url: string; type: 'existing' | 'new' }[];
  deletedImageIds: string[];
};

export function useSaveProductMutation() {
  return useMutation<IProduct, Error, SaveProductArgs>({
    mutationKey: ['saveProduct'],
    mutationFn: async (args) => {
      const user = auth.currentUser;
      const token = await user?.getIdToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      // You likely upload new images elsewhere; here we just pass URLs.
      const images = args.images.map((i) => i.url);

      const payload = {
        ...args.data,
        images,
        imageUrl: images[0] ?? null,
      };

      if (args.mode === 'add') {
        const { data } = await api.post<IProduct>('/products', payload, {
          headers,
        });
        return data;
      }

      if (!args.productId) throw new Error('Missing productId for edit');

      const { data } = await api.put<IProduct>(
        `/products/${args.productId}`,
        payload,
        { headers },
      );
      return data;
    },
  });
}
