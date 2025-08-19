import { create } from 'zustand';

export const ORDER_TOTAL_MIN = 0;
export const ORDER_TOTAL_MAX = 100000;

export interface OrderFilterState {
  searchTerm: string;
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null; // YYYY-MM-DD
  status: string; // '' = All

  // NEW:
  minTotal: number;
  maxTotal: number;

  setSearchTerm: (term: string) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setStatus: (status: string) => void;

  // NEW:
  setMinTotal: (v: number) => void;
  setMaxTotal: (v: number) => void;

  resetFilters: () => void;
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  searchTerm: '',
  dateFrom: null,
  dateTo: null,
  status: '',

  // NEW defaults:
  minTotal: ORDER_TOTAL_MIN,
  maxTotal: ORDER_TOTAL_MAX,

  setSearchTerm: (term) => set({ searchTerm: term }),
  setDateFrom: (date) => set({ dateFrom: date }),
  setDateTo: (date) => set({ dateTo: date }),
  setStatus: (status) => set({ status }),

  // NEW setters:
  setMinTotal: (v) => set({ minTotal: v }),
  setMaxTotal: (v) => set({ maxTotal: v }),

  resetFilters: () =>
    set({
      searchTerm: '',
      dateFrom: null,
      dateTo: null,
      status: '',
      minTotal: ORDER_TOTAL_MIN,
      maxTotal: ORDER_TOTAL_MAX,
    }),
}));
