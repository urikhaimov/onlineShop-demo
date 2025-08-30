import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOrderSettings, saveOrderSettings } from '../api/orderSettings';
import type { TOrderSettings } from '@common/types';
import { useAuth } from './useAuth'; // adjust to your auth hook

const QUERY_KEY = ['orderSettings'];

export function useOrderSettings() {
  return useQuery<TOrderSettings>({
    queryKey: QUERY_KEY,
    queryFn: fetchOrderSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrderSettingsMutation() {
  const qc = useQueryClient();
  const { user } = useAuth(); // expects { uid, displayName } etc.

  return useMutation({
    mutationFn: (
      data: Pick<TOrderSettings, 'shipping' | 'taxRate' | 'discount'>,
    ) =>
      saveOrderSettings(
        data,
        user ? { uid: user.uid, name: user.displayName } : undefined,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
