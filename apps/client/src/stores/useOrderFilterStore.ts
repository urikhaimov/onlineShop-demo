import { create } from 'zustand';

export interface OrderFilterState {
  searchTerm: string;
  dateFrom: string | null;
  dateTo: string | null;
  status: string;

  setSearchTerm: (term: string) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setStatus: (status: string) => void;
  resetFilters: () => void;
}

export const useOrderFilterStore = create<OrderFilterState>((set) => ({
  searchTerm: '',
  dateFrom: null,
  dateTo: null,
  status: '',

  setSearchTerm: (term) => set({ searchTerm: term }),
  setDateFrom: (date) => set({ dateFrom: date }),
  setDateTo: (date) => set({ dateTo: date }),
  setStatus: (status) => set({ status }),
  resetFilters: () =>
    set({
      searchTerm: '',
      dateFrom: null,
      dateTo: null,
      status: '',
    }),
}));
