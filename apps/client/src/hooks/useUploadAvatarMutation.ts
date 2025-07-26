import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export const useUploadAvatarMutation = (uid: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: Blob) => {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axiosInstance.post(`/users/${uid}/avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return res.data as { photoURL: string };
    },
    onSuccess: (data) => {
      // Option A: Update in place
      queryClient.setQueryData(['userProfile', uid], (old: any) =>
        old ? { ...old, photoURL: data.photoURL } : old,
      );

      // Option B (alternative): trigger refetch
      // queryClient.invalidateQueries({ queryKey: ['userProfile', uid] });
    },
  });
};
