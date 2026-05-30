// hooks/useAllProducts.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export function useAllProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await axiosInstance.get('/products');
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min — catalog rarely changes
    gcTime: 30 * 60 * 1000,
  });
}
