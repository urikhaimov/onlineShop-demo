// src/hooks/useThemeHooks.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { ThemeSettings } from '../api/theme';

// GET theme settings
export function useThemeSettings() {
  return useQuery<ThemeSettings>({
    queryKey: ['themeSettings'],
    queryFn: async () => {
      const { data } = await api.get('/theme/settings');
      return data;
    },
  });
}

// POST updated theme settings
export function useUpdateThemeSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: ThemeSettings) => {
      const { data } = await api.post('/theme/settings', newSettings);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['themeSettings'] });
    },
  });
}
