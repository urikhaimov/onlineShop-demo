// src/stores/useProductStore.ts
import { create } from 'zustand';
import type { Dayjs } from 'dayjs';

export const PRICE_MIN = 0;
export const PRICE_MAX = 100_000;
export const STOCK_MIN = 0;
export const STOCK_MAX = 1_000;

type ProductFilterState = {
  // loading control
  loading: boolean;
  /** internal counter of concurrent async ops */
  _pending: number;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;

  // filters
  searchTerm: string;
  selectedCategoryId: string;
  updatedFrom: Dayjs | null;
  updatedTo: Dayjs | null;
  minPrice: number;
  maxPrice: number;
  minStock: number;
  maxStock: number;

  // setters
  setSearchTerm: (v: string) => void;
  setSelectedCategoryId: (v: string) => void;
  setUpdatedFrom: (v: Dayjs | null) => void;
  setUpdatedTo: (v: Dayjs | null) => void;
  setMinPrice: (v: number) => void;
  setMaxPrice: (v: number) => void;
  setMinStock: (v: number) => void;
  setMaxStock: (v: number) => void;

  // utils
  resetFilters: () => void;
};

const defaultFilterState = {
  searchTerm: '',
  selectedCategoryId: '',
  updatedFrom: null as Dayjs | null,
  updatedTo: null as Dayjs | null,
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  minStock: STOCK_MIN,
  maxStock: STOCK_MAX,
};

export const useProductStore = create<ProductFilterState>((set, get) => ({
  // start as false; toggle explicitly
  loading: false,
  _pending: 0,

  startLoading: () => {
    const p = get()._pending + 1;
    set({ _pending: p, loading: true });
  },
  stopLoading: () => {
    const p = Math.max(0, get()._pending - 1);
    set({ _pending: p, loading: p > 0 });
  },
  withLoading: async (fn) => {
    get().startLoading();
    try {
      return await fn();
    } finally {
      get().stopLoading();
    }
  },

  ...defaultFilterState,

  setSearchTerm: (v) => set({ searchTerm: v }),
  setSelectedCategoryId: (v) => set({ selectedCategoryId: v }),
  setUpdatedFrom: (v) => set({ updatedFrom: v }),
  setUpdatedTo: (v) => set({ updatedTo: v }),
  setMinPrice: (v) => set({ minPrice: v }),
  setMaxPrice: (v) => set({ maxPrice: v }),
  setMinStock: (v) => set({ minStock: v }),
  setMaxStock: (v) => set({ maxStock: v }),

  resetFilters: () => set({ ...defaultFilterState }),
}));
