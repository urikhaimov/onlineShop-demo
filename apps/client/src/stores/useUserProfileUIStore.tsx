// ✅ Zustand store extracted from LocalReducer and LocalUIReducer
import { create } from 'zustand';
import { registerStoreReset } from '../state/resetRegistry';

interface UserProfileToastStore {
  toastOpen: boolean;
  toastMessage: string;
  errorMsg: string;
  setToastOpen: (open: boolean) => void;
  setToastMessage: (message: string) => void;
  setErrorMsg: (message: string) => void;
  resetToast: () => void;
}

export const useUserProfileToastStore = create<UserProfileToastStore>(
  (set) => ({
    toastOpen: false,
    toastMessage: '',
    errorMsg: '',
    setToastOpen: (open) => set({ toastOpen: open }),
    setToastMessage: (message) => set({ toastMessage: message }),
    setErrorMsg: (message) => set({ errorMsg: message }),
    resetToast: () => set({ toastOpen: false, toastMessage: '', errorMsg: '' }),
  }),
);

interface UserProfileUIStore {
  avatarVer: number;
  avatarUploading: boolean;
  deleteDialogOpen: boolean;
  incrementAvatarVer: () => void;
  setUploading: (value: boolean) => void;
  setDeleteDialog: (open: boolean) => void;
}

export const useUserProfileUIStore = create<UserProfileUIStore>((set) => ({
  avatarVer: 0,
  avatarUploading: false,
  deleteDialogOpen: false,
  incrementAvatarVer: () =>
    set((state) => ({ avatarVer: state.avatarVer + 1 })),
  setUploading: (value) => set({ avatarUploading: value }),
  setDeleteDialog: (open) => set({ deleteDialogOpen: open }),
}));

// Reset on logout — user-specific UI state must not leak to the next user.
registerStoreReset(() => useUserProfileToastStore.getState().resetToast());
registerStoreReset(() =>
  useUserProfileUIStore.setState({
    avatarVer: 0,
    avatarUploading: false,
    deleteDialogOpen: false,
  }),
);
