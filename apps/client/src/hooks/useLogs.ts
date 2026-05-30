import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { SecurityLog } from '../api/logs';
import { isDemoAdmin } from '../lib/demo-mode';

export async function fetchLogs(categoryId?: string): Promise<SecurityLog[]> {
  // Adjust your API endpoint as needed
  const url = categoryId ? `/logs?category=${categoryId}` : '/api/logs';
  const res = await axiosInstance.get(url);
  return res.data;
}

export function useLogs(categoryId?: string) {
  return useQuery<SecurityLog[], Error>({
    queryKey: ['logs', categoryId ?? 'all'],
    queryFn: () => fetchLogs(categoryId),
    staleTime: 1000 * 60 * 2, // 2-minute cache
    refetchOnWindowFocus: false,
    enabled: !isDemoAdmin(),
  });
}
