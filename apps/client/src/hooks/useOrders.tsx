import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosInstance'; // wrapped axios instance

// ---- Public type consumed by the app ----------------------------------------
export interface Order {
  id: string;
  userId: string;
  email: string | null;
  total: number; // MAJOR
  createdAt: string | { toDate?: () => Date };
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment?: {
    method?: string;
    status?: 'paid' | 'unpaid';
    transactionId?: string;
  };
  // add what you need later (items, shipping, etc.)
}

// ---- Small, local normalizer -------------------------------------------------
function normalize(dto: any): Order {
  // Provider → app status
  const providerStatus = String(
    dto?.payment?.status ?? dto?.status ?? '',
  ).toLowerCase();
  const isSucceeded = providerStatus === 'succeeded';
  const isOpen = providerStatus === 'open' || dto?.status === 'open';

  // Map anything "open/pending/processing/requires_*" to 'pending'
  const status: Order['status'] = isSucceeded
    ? 'confirmed'
    : isOpen ||
        providerStatus === 'pending' ||
        providerStatus === 'processing' ||
        providerStatus === 'requires_action' ||
        providerStatus === 'requires_confirmation'
      ? 'pending'
      : (
            [
              'confirmed',
              'shipped',
              'delivered',
              'cancelled',
              'canceled',
            ] as const
          ).includes(dto?.status)
        ? dto?.status === 'canceled'
          ? 'cancelled'
          : dto?.status
        : 'pending';

  // Total: prefer server's major value; fall back from minor if needed
  const totalMajor =
    typeof dto?.total === 'number'
      ? dto.total
      : typeof dto?.totalMinor === 'number'
        ? Math.round(dto.totalMinor) / 100
        : 0;

  return {
    id: String(dto?.id ?? dto?.paymentIntentId ?? ''),
    userId: String(dto?.userId ?? ''),
    email: dto?.customer?.email ?? dto?.email ?? null,
    total: totalMajor,
    createdAt: dto?.createdAt ?? new Date().toISOString(),
    status,
    payment: {
      method: dto?.payment?.method ?? 'card',
      status: isSucceeded ? 'paid' : 'unpaid',
      transactionId:
        dto?.payment?.transactionId ?? dto?.paymentIntentId ?? dto?.id,
    },
  };
}

// ---- Data access -------------------------------------------------------------
export async function fetchOrders(): Promise<Order[]> {
  const res = await api.get('/orders'); // no /api prefix needed
  const data = Array.isArray(res.data) ? res.data : [];

  // Normalize ALL rows
  const orders = data.map(normalize);

  // (Optional) hide ephemeral “draft” orders that never completed:
  // return orders.filter(o => !(o.status === 'pending' && o.total === 0));

  return orders;
}

// ---- Hook --------------------------------------------------------------------
export function useOrders() {
  return useQuery<Order[], Error>({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });
}
