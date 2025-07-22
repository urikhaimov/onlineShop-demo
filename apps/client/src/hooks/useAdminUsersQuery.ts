import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '../types/User';
import api from '../api/axiosInstance';
import { useAuth } from './useAuth';

export function useAdminUsersQuery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: users = [],
    isLoading,
    error,
  } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users'); // No `/api` prefix — already in axiosInstance baseURL
      return res.data;
    },
  });

  const updateUserRole = async (id: string, role: User['role']) => {
    await api.patch(`/users/${id}`, { role });
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const deleteUser = async (id: string) => {
    await api.delete(`/users/${id}`);
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return { users, isLoading, error, updateUserRole, deleteUser };
}
