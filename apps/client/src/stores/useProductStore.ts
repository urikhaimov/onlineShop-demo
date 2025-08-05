// src/stores/useProductStore.ts
import { create } from 'zustand';
import { IProduct } from '@common/types';
import { Dayjs } from 'dayjs';
import { SortingState, ColumnFiltersState } from '@tanstack/react-table';

interface ProductStoreState {
  products: IProduct[];
  lastDoc: any;
  loading: boolean;
  hasMore: boolean;
  searchTerm: string;
  selectedCategoryId: string;
  createdAfter: Dayjs | null;
  minPrice: number;
  maxPrice: number;
  page: number;
  pageSize: number;
  successMessage: string;
  pendingDelete: IProduct | null;
  reorderPending: boolean;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  snackbarOpen: boolean;

  // Actions
  setProducts: (products: IProduct[]) => void;
  addProducts: (products: IProduct[]) => void;
  removeProduct: (id: string) => void;
  setLastDoc: (doc: any) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategoryId: (id: string) => void;
  setCreatedAfter: (date: Dayjs | null) => void;
  setMinPrice: (price: number) => void;
  setMaxPrice: (price: number) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSuccessMessage: (msg: string) => void;
  setPendingDelete: (product: IProduct | null) => void;
  setReorderPending: (pending: boolean) => void;
  setSorting: (sorting: SortingState) => void;
  setColumnFilters: (filters: ColumnFiltersState) => void;
  setSnackbarOpen: (open: boolean) => void;
}

export const useProductStore = create<ProductStoreState>((set) => ({
  products: [],
  lastDoc: null,
  loading: false,
  hasMore: true,
  searchTerm: '',
  selectedCategoryId: '',
  createdAfter: null,
  minPrice: 0,
  maxPrice: 10000,
  page: 0,
  pageSize: 20,
  successMessage: '',
  pendingDelete: null,
  reorderPending: false,
  sorting: [],
  columnFilters: [],
  snackbarOpen: false,

  setProducts: (products) => set({ products }),
  addProducts: (products) =>
    set((state) => ({ products: [...state.products, ...products] })),
  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),
  setLastDoc: (doc) => set({ lastDoc: doc }),
  setLoading: (loading) => set({ loading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setSelectedCategoryId: (id) => set({ selectedCategoryId: id }),
  setCreatedAfter: (date) => set({ createdAfter: date }),
  setMinPrice: (price) => set({ minPrice: price }),
  setMaxPrice: (price) => set({ maxPrice: price }),
  setPage: (page) => set({ page }),
  setPageSize: (size) => set({ pageSize: size }),
  setSuccessMessage: (msg) => set({ successMessage: msg }),
  setPendingDelete: (product) => set({ pendingDelete: product }),
  setReorderPending: (pending) => set({ reorderPending: pending }),
  setSorting: (sorting) => set({ sorting }),
  setColumnFilters: (filters) => set({ columnFilters: filters }),
  setSnackbarOpen: (open) => set({ snackbarOpen: open }),
}));
