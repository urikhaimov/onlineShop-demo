// src/stores/useProductStore.ts
import { create } from 'zustand'; // ✅ named import (no default)
import type { Dayjs } from 'dayjs';

type ProductFilterState = {
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

  // optional helper
  reset: () => void;
};

const DEFAULTS = {
  searchTerm: '',
  selectedCategoryId: '',
  updatedFrom: null as Dayjs | null,
  updatedTo: null as Dayjs | null,
  minPrice: 0,
  maxPrice: 100000,
  minStock: 0,
  maxStock: 1000,
};

export const useProductStore = create<ProductFilterState>((set) => ({
  ...DEFAULTS,

  setSearchTerm: (v) => set({ searchTerm: v }),
  setSelectedCategoryId: (v) => set({ selectedCategoryId: v }),
  setUpdatedFrom: (v) => set({ updatedFrom: v }),
  setUpdatedTo: (v) => set({ updatedTo: v }),
  setMinPrice: (v) => set({ minPrice: v }),
  setMaxPrice: (v) => set({ maxPrice: v }),
  setMinStock: (v) => set({ minStock: v }),
  setMaxStock: (v) => set({ maxStock: v }),

  reset: () => set({ ...DEFAULTS }),
}));
