import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { IProduct } from '@common/types';
import { isDemoAdmin } from '../lib/demo-mode';

const PRODUCT_BASE = isDemoAdmin() ? '/products/public' : '/products';

export function useProduct(productId?: string) {
  return useQuery<IProduct | null>({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null;
      const res = await axiosInstance.get(`${PRODUCT_BASE}/${productId}`);
      return res.data;
    },
    enabled: !!productId,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Partial<IProduct> & { id: string }) => {
      const { id, ...data } = product;
      const res = await axiosInstance.put(`/products/${id}`, data);
      return res.data;
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({
        queryKey: ['product', updatedProduct.id],
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
