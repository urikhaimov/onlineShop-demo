// src/stores/useCardDialogStore.ts
import { create } from 'zustand';

type State = {
  dialogOpenId: string | null;
  loadingId: string | null;
};

type Actions = {
  openDialog: (id: string) => void;
  closeDialog: () => void;
  setLoading: (id: string | null) => void;
};

export const useCardDialogStore = create<State & Actions>((set) => ({
  dialogOpenId: null,
  loadingId: null,

  openDialog: (id) => set({ dialogOpenId: id }),
  closeDialog: () => set({ dialogOpenId: null }),
  setLoading: (id) => set({ loadingId: id }),
}));
