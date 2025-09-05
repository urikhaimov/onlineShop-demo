import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BgVariant =
  | 'aurora'
  | 'mesh'
  | 'shimmer'
  | 'bokeh'
  | 'rays'
  | 'stripes';

type State = {
  enabled: boolean;
  variant: BgVariant;
  setVariant: (v: BgVariant) => void;
  toggle: () => void;
};

export const useBackgroundStore = create<State>()(
  persist(
    (set) => ({
      enabled: true,
      variant: 'mesh',
      setVariant: (v) => set({ variant: v }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: 'bg-store:v1' },
  ),
);
