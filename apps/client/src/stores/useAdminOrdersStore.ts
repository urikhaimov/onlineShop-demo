// src/stores/useAdminOrdersStore.ts
import { create } from 'zustand';
import {
  ColumnFiltersState,
  SortingState,
  Updater,
} from '@tanstack/react-table';

export type FilterState = {
  email: string;
  status: string;
  minTotal: number | null;
  maxTotal: number | null;
  startDate: Date | null;
  endDate: Date | null;
  sortDirection: 'asc' | 'desc';
  page: number;
  pageSize: number;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
};

export type FilterAction =
  | { type: 'setEmail'; payload: string }
  | { type: 'setStatus'; payload: string }
  | { type: 'setMinTotal'; payload: number }
  | { type: 'setMaxTotal'; payload: number }
  | { type: 'setStartDate'; payload: Date | null }
  | { type: 'setEndDate'; payload: Date | null }
  | { type: 'setSortDirection'; payload: 'asc' | 'desc' }
  | { type: 'setPage'; payload: number }
  | { type: 'setMinPrice'; payload: number | null }
  | { type: 'setMaxPrice'; payload: number | null }
  | { type: 'setInStockOnly'; payload: boolean }
  | { type: 'RESET_FILTERS' };

export const initialAdminOrderFilters: FilterState = {
  email: '',
  status: 'all',
  minTotal: null,
  maxTotal: null,
  startDate: null,
  endDate: null,
  sortDirection: 'desc',
  page: 1,
  pageSize: 5,
  minPrice: null,
  maxPrice: null,
  inStockOnly: false,
};

interface AdminOrdersStore {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  snackbarOpen: boolean;

  filters: FilterState;

  setSorting: (updater: Updater<SortingState>) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  setSnackbarOpen: (open: boolean) => void;

  updateFilter: <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => void;
  resetFilters: () => void;
}

export const useAdminOrdersStore = create<AdminOrdersStore>((set, get) => ({
  sorting: [],
  columnFilters: [],
  snackbarOpen: false,

  filters: initialAdminOrderFilters,

  setSorting: (updater) => {
    const current = get().sorting;
    const next = typeof updater === 'function' ? updater(current) : updater;
    set({ sorting: next });
  },

  setColumnFilters: (updater) => {
    const current = get().columnFilters;
    const next = typeof updater === 'function' ? updater(current) : updater;
    set({ columnFilters: next });
  },

  setSnackbarOpen: (open) => set({ snackbarOpen: open }),

  updateFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        ...(key !== 'page' && { page: 1 }), // Reset to page 1 unless updating page directly
      },
    })),

  resetFilters: () =>
    set({
      filters: { ...initialAdminOrderFilters },
    }),
}));
