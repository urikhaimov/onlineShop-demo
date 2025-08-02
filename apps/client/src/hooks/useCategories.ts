import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useOptimisticMutation } from './useOptimisticMutation';
import { Category } from '../types/firebase';
import api from '../api/axiosInstance';

export const useCategories = () => {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
  });
};

export const useCategoryById = (id?: string) => {
  return useQuery<Category>({
    queryKey: ['category', id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/categories/${id}`);
      return res.data;
    },
  });
};

export const useAddCategory = () => {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/categories', { name });
      return res.data;
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || 'Failed to add category';
      enqueueSnackbar(message, { variant: 'error' });
    },
    onSuccess: async () => {
      enqueueSnackbar('Category added', { variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const previous = queryClient.getQueryData<Category[]>(['categories']);
      queryClient.setQueryData(
        ['categories'],
        previous?.filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['categories'], context?.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
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
