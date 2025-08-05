// src/stores/useCategoryTableStore.ts
import { create } from 'zustand';
import {
  SortingState,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table';

interface CategoryTableStore {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;

  setSorting: (updater: Updater<SortingState>) => void;
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
}

export const useCategoryTableStore = create<CategoryTableStore>((set, get) => ({
  sorting: [],
  columnFilters: [],

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
