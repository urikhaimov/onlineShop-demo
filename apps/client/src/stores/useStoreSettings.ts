import { create } from 'zustand';

interface StoreSettings {
  storeId: string;
  setStoreId: (id: string) => void;
  initialized: boolean;
  init: () => void;
}

export const useStoreSettings = create<StoreSettings>((set) => ({
  storeId: 'store1',
  initialized: false,
  init: () => {
    const saved = localStorage.getItem('storeId') || 'store1';
    set({ storeId: saved, initialized: true });
  },
  setStoreId: (id: string) => {
    localStorage.setItem('storeId', id);
    set({ storeId: id });
  },
}));
