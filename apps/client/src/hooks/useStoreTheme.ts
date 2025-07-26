// src/hooks/useStoreTheme.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { ThemeSettings } from '..//api/theme';

export const useStoreTheme = (storeId = 'store1') => {
  return useQuery<ThemeSettings>({
    queryKey: ['storeTheme', storeId],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ThemeSettings>(
        `/theme/settings?storeId=${storeId}`,
      );
      return data;
    },
  });
};
