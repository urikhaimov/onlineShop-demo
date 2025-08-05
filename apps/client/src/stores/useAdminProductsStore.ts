// src/stores/useAdminProductsStore.ts
import { create } from 'zustand';
import { IProduct } from '@common/types';
import { Dayjs } from 'dayjs';
import {
  ColumnFiltersState,
  SortingState,
  Updater,
} from '@tanstack/react-table';

interface AdminProductsStore {
  products: IProduct[];
  loading: boolean;
  snackbarOpen: boolean;
  reorderPending: boolean;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;

  setProducts: (products: IProduct[]) => void;
  setProductsSorted: (products: IProduct[]) => void;
  addProducts: (products: IProduct[]) => void;
  removeProduct: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSnackbarOpen: (open: boolean) => void;
  setReorderPending: (pending: boolean) => void;
  setSorting: (updater: Updater<SortingState>) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
}

export const useAdminProductsStore = create<AdminProductsStore>((set, get) => ({
  products: [],
  loading: false,
  snackbarOpen: false,
  reorderPending: false,
  sorting: [],
  columnFilters: [],

  setProducts: (products) => set({ products }),
  setProductsSorted: (products) =>
    set({
      products: [...products].sort(
        (a, b) => (a.order ?? 9999) - (b.order ?? 9999),
      ),
    }),
  addProducts: (products) =>
    set((state) => ({ products: [...state.products, ...products] })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setSnackbarOpen: (open) => set({ snackbarOpen: open }),
  setReorderPending: (reorderPending) => set({ reorderPending }),
  setSorting: (updater) => {
    const prev = get().sorting;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    set({ sorting: next });
  },
  setColumnFilters: (updater) => {
    const prev = get().columnFilters;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    set({ columnFilters: next });
  },
}));
