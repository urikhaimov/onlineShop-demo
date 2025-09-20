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

// Allowed patch (matches UpdateOrderDto)
type UpdateOrderPatch = Partial<{
  status: Order['status'];
  notes: string | null;
  delivery: { provider?: string; trackingNumber?: string; eta?: string };
  notifyCustomer: boolean;
}>;

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

      const body: UpdateOrderPatch = {};

      // status
      if (update.status !== undefined) {
        body.status = update.status as Order['status'];
      }

      // notes (internal)
      if (update.notes !== undefined) {
        body.notes = (update.notes as any) ?? null;
      }

      // delivery: only include non-empty fields
      if (update.delivery !== undefined) {
        const provider = update.delivery?.provider || undefined;
        const trackingNumber = update.delivery?.trackingNumber || undefined;
        const eta = (update as any).delivery?.eta || undefined;

        if (provider || trackingNumber || eta) {
          body.delivery = { provider, trackingNumber, eta };
        }
      }

      // 🔔 Notify when status or delivery is being updated
      const hasStatusUpdate = update.status !== undefined;
      const hasDeliveryUpdate =
        !!update.delivery &&
        !!(
          update.delivery.provider ||
          update.delivery.trackingNumber ||
          (update as any).delivery?.eta
        );

      if (hasStatusUpdate || hasDeliveryUpdate) {
        body.notifyCustomer = true;
      }

      await updateOrderById(id, body);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['order', id] }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
    },
  });
}

export { useOrder, useUpdateOrder, Order };
