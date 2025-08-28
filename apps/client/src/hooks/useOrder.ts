import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchOrderById, updateOrderById } from '../api/orderApi';
import type { TOrder as Order } from '@common/types';
import { useAuth } from './useAuth';

// Fetch a single order
function useOrder(id?: string) {
  return useQuery<Order, Error>({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data } = await fetchOrderById(id);
      return data;
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
  });
}

// Update a single order
function useUpdateOrder(
  id?: string,
): UseMutationResult<
  void,
  Error,
  Partial<Order> & { previousStatus?: string }
> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      update: Partial<Order> & { previousStatus?: string },
    ) => {
      if (!id) throw new Error('Order ID is required');
      if (!user) throw new Error('Admin user required');

      const patch: Partial<Order> = {
        ...update,
        updatedAt: new Date(),
      };

      if (update.status && update.status !== update.previousStatus) {
        patch.statusHistory = [
          ...(update.statusHistory || []),
          {
            status: update.status,
            timestamp: new Date().toISOString(),
            changedBy: user.displayName || user.email || 'admin',
          },
        ];
      }

      await updateOrderById(id, patch);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
  });
}

// ✅ Export everything needed
export { useOrder, useUpdateOrder, Order };
