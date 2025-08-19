// src/stores/useProductStore.ts
import { create } from 'zustand';
import type { Dayjs } from 'dayjs';

export const PRICE_MIN = 0;
export const PRICE_MAX = 100_000;
export const STOCK_MIN = 0;
export const STOCK_MAX = 1_000;

type ProductFilterState = {
  searchTerm: string;
  selectedCategoryId: string;
  updatedFrom: Dayjs | null;
  updatedTo: Dayjs | null;
  minPrice: number;
  maxPrice: number;
  minStock: number;
  maxStock: number;

  setSearchTerm: (v: string) => void;
  setSelectedCategoryId: (v: string) => void;
  setUpdatedFrom: (v: Dayjs | null) => void;
  setUpdatedTo: (v: Dayjs | null) => void;
  setMinPrice: (v: number) => void;
  setMaxPrice: (v: number) => void;
  setMinStock: (v: number) => void;
  setMaxStock: (v: number) => void;

  // NEW
  resetFilters: () => void;
};

export const useProductStore = create<ProductFilterState>((set) => ({
  searchTerm: '',
  selectedCategoryId: '',
  updatedFrom: null,
  updatedTo: null,
  minPrice: PRICE_MIN,
  maxPrice: PRICE_MAX,
  minStock: STOCK_MIN,
  maxStock: STOCK_MAX,

  setSearchTerm: (v) => set({ searchTerm: v }),
  setSelectedCategoryId: (v) => set({ selectedCategoryId: v }),
  setUpdatedFrom: (v) => set({ updatedFrom: v }),
  setUpdatedTo: (v) => set({ updatedTo: v }),
  setMinPrice: (v) => set({ minPrice: v }),
  setMaxPrice: (v) => set({ maxPrice: v }),
  setMinStock: (v) => set({ minStock: v }),
  setMaxStock: (v) => set({ maxStock: v }),

  resetFilters: () =>
    set({
      searchTerm: '',
      selectedCategoryId: '',
      updatedFrom: null,
      updatedTo: null,
      minPrice: PRICE_MIN,
      maxPrice: PRICE_MAX,
      minStock: STOCK_MIN,
      maxStock: STOCK_MAX,
    }),
}));
