// src/hooks/useAllCategories.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance'; // make sure this is preconfigured with baseURL

export interface Category {
  id: string;
  name: string;
}

export function useAllCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await axiosInstance.get('/categories');
      return response.data;
    },
  });
}
