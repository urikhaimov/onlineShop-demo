// src/stores/useStripeCheckoutStore.ts
import { create } from 'zustand';

interface StripeCheckoutState {
  clientSecret: string | null;
  loading: boolean;
  error: string | null;
  setClientSecret: (secret: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStripeCheckoutStore = create<StripeCheckoutState>((set) => ({
  clientSecret: null,
  loading: false,
  error: null,
  setClientSecret: (clientSecret) => set({ clientSecret }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
