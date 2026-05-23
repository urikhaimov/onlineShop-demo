import { create } from 'zustand';
import {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';
import { TOrder } from '@common/types';
import { registerStoreReset } from '../state/resetRegistry';

interface OrdersPageState {
  orders: TOrder[];
  loading: boolean;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  viewMode: 'table' | 'cards';
  mobileFiltersOpen: boolean;

  setOrders: (orders: TOrder[]) => void;
  setLoading: (loading: boolean) => void;
  setSorting: (updater: Updater<SortingState>) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  setViewMode: (mode: 'table' | 'cards') => void;
  setMobileFiltersOpen: (open: boolean) => void;
}

export const useOrdersPageStore = create<OrdersPageState>((set, get) => ({
  orders: [],
  loading: true,
  sorting: [],
  columnFilters: [],
  viewMode: 'table',
  mobileFiltersOpen: false,

  setOrders: (orders) => set({ orders }),
  setLoading: (loading) => set({ loading }),

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

  setViewMode: (mode) => set({ viewMode: mode }),
  setMobileFiltersOpen: (open) => set({ mobileFiltersOpen: open }),
}));

// Reset on logout — orders array is per-user; must not leak to next session.
registerStoreReset(() =>
  useOrdersPageStore.setState({
    orders: [],
    loading: true,
    sorting: [],
    columnFilters: [],
    mobileFiltersOpen: false,
  }),
);
