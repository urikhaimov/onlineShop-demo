import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../api/axiosInstance';
import type { LandingPageData } from '@common/types';

const KEY = ['landing'];

export function useLandingPage() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<LandingPageData> => {
      const { data } = await axios.get('/landing');
      console.log('data from server:', data);
      return data;
    },
  });
}

export function useUpdateLandingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LandingPageData) => {
      const { data } = await axios.put('/landing', payload);
      return data as LandingPageData;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
    },
  });
}
