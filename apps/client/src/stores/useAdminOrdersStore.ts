// src/stores/useAdminOrdersStore.ts
import { create } from 'zustand';
import type {
  ColumnFiltersState,
  SortingState,
  Updater,
} from '@tanstack/react-table';

export type OrderStatus =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'succeeded';

export type SortDirection = 'asc' | 'desc';

export interface AdminOrderFilterState {
  email: string;
  status: OrderStatus;
  minTotal: number | null;
  maxTotal: number | null;
  startDate: Date | null;
  endDate: Date | null;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
  minPrice: number | null;
  maxPrice: number | null;
  inStockOnly: boolean;
}

// Optional: only keep this if you actually use a reducer elsewhere.
export type FilterAction =
  | { type: 'setEmail'; payload: string }
  | { type: 'setStatus'; payload: OrderStatus }
  | { type: 'setMinTotal'; payload: number | null }
  | { type: 'setMaxTotal'; payload: number | null }
  | { type: 'setStartDate'; payload: Date | null }
  | { type: 'setEndDate'; payload: Date | null }
  | { type: 'setSortDirection'; payload: SortDirection }
  | { type: 'setPage'; payload: number }
  | { type: 'setMinPrice'; payload: number | null }
  | { type: 'setMaxPrice'; payload: number | null }
  | { type: 'setInStockOnly'; payload: boolean }
  | { type: 'RESET_FILTERS' };

export const initialAdminOrderFilters: AdminOrderFilterState = {
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

export interface AdminOrdersStore {
  // table state
  sorting: SortingState;
  setSorting: (updater: Updater<SortingState>) => void;

  columnFilters: ColumnFiltersState;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;

  // ui state
  snackbarOpen: boolean;
  setSnackbarOpen: (open: boolean) => void;

  // filters
  filters: AdminOrderFilterState;
  updateFilter: <K extends keyof AdminOrderFilterState>(
    key: K,
    value: AdminOrderFilterState[K],
  ) => void;
  setFilters: (next: AdminOrderFilterState) => void; // bulk set (useful for URL→store)
  resetFilters: () => void;
}

export const useAdminOrdersStore = create<AdminOrdersStore>((set, get) => ({
  sorting: [],
  setSorting: (updater) => {
    const curr = get().sorting;
    const next = typeof updater === 'function' ? updater(curr) : updater;
    set({ sorting: next });
  },

  columnFilters: [],
  setColumnFilters: (updater) => {
    const curr = get().columnFilters;
    const next = typeof updater === 'function' ? updater(curr) : updater;
    set({ columnFilters: next });
  },

  snackbarOpen: false,
  setSnackbarOpen: (open) => set({ snackbarOpen: open }),

  filters: initialAdminOrderFilters,

  updateFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
        // reset to page 1 on any filter change *except* when changing page
        ...(key === 'page' ? null : { page: 1 }),
      },
    })),

  setFilters: (next) => set({ filters: next }),

  resetFilters: () => set({ filters: initialAdminOrderFilters }),
}));
