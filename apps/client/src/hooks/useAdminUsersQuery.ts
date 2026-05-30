import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IUser } from '@common/types';
import api from '../api/axiosInstance';
import { useAuth } from './useAuth';
import { isDemoAdmin } from '../lib/demo-mode';

export function useAdminUsersQuery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<IUser[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users'); // No `/api` prefix — already in axiosInstance baseURL
      return res.data;
    },
    enabled: !isDemoAdmin(),
  });

  const updateUserRole = async (id: string, role: IUser['role']) => {
    await api.patch(`/users/${id}`, { role });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/users/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return { users, isLoading, error, updateUserRole, deleteUser };
}
