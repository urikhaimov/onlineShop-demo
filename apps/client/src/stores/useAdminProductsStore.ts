import { create } from 'zustand';
import type {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';
import type { IProduct } from '@common/types';

export interface AdminProductsStore {
  products: IProduct[];
  loading: boolean;
  snackbarOpen: boolean;

  // table state
  sorting: SortingState;
  columnFilters: ColumnFiltersState;

  // drawer state (persisted so it won’t close on each URL change)
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;

  setProducts: (p: IProduct[]) => void;
  setProductsSorted: (p: IProduct[]) => void;
  setLoading: (v: boolean) => void;
  setSnackbarOpen: (v: boolean) => void;
  setSorting: (updater: Updater<SortingState>) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
}

export const useAdminProductsStore = create<AdminProductsStore>((set, get) => ({
  products: [],
  loading: false,
  snackbarOpen: false,

  sorting: [],
  columnFilters: [],

  filtersOpen: false,
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),

  setProducts: (products) => set({ products }),
  setProductsSorted: (products) => set({ products }), // if you sort by a field, do it here
  setLoading: (loading) => set({ loading }),
  setSnackbarOpen: (snackbarOpen) => set({ snackbarOpen }),

  setSorting: (updater) => {
    const curr = get().sorting;
    const next = typeof updater === 'function' ? updater(curr) : updater;
    set({ sorting: next });
  },
  setColumnFilters: (updater) => {
    const curr = get().columnFilters;
    const next = typeof updater === 'function' ? updater(curr) : updater;
    set({ columnFilters: next });
  },
}));
