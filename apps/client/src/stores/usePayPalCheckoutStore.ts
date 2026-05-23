import { create } from 'zustand';
import { registerStoreReset } from '../state/resetRegistry';

interface PayPalCheckoutState {
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePayPalCheckoutStore = create<PayPalCheckoutState>((set) => ({
  loading: false,
  error: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ loading: false, error: null }),
}));

// Reset on logout so transient checkout state doesn't carry between sessions.
registerStoreReset(() => usePayPalCheckoutStore.getState().reset());
