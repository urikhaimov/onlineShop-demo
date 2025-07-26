import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export const useDeleteAvatarMutation = (uid: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => axiosInstance.delete(`/users/${uid}/avatar`),

    onSuccess: () => {
      // ✅ Optimistic UI: clear the cached photoURL immediately
      queryClient.setQueryData(['userProfile', uid], (prev: any) =>
        prev ? { ...prev, photoURL: null } : prev,
      );

      // ✅ React Query v5 syntax for invalidation
      queryClient.invalidateQueries({
        queryKey: ['userProfile', uid],
      });
    },
  });
};
