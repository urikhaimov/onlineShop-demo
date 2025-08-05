import { create } from 'zustand';
import { IUser as User } from '@common/types';

interface AdminUsersUIState {
  confirmOpen: boolean;
  selectedUser: User | null;
  mobileDrawerOpen: boolean;

  openConfirm: (user: User) => void;
  closeConfirm: () => void;

  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
}

export const useAdminUsersUIStore = create<AdminUsersUIState>((set) => ({
  confirmOpen: false,
  selectedUser: null,
  mobileDrawerOpen: false,

  openConfirm: (user: User) => set({ confirmOpen: true, selectedUser: user }),
  closeConfirm: () => set({ confirmOpen: false, selectedUser: null }),

  openMobileDrawer: () => set({ mobileDrawerOpen: true }),
  closeMobileDrawer: () => set({ mobileDrawerOpen: false }),
}));
