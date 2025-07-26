import { Timestamp } from 'firebase/firestore';

export type Order = {
  id: string;
  createdAt: Timestamp;
  status: string;
  email: string;
  amount: number;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
};

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

export const initialFilterState: FilterState = {
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

export function filterReducer(
  state: FilterState,
  action: FilterAction,
): FilterState {
  switch (action.type) {
    case 'setEmail':
      return { ...state, email: action.payload, page: 1 };
    case 'setStatus':
      return { ...state, status: action.payload, page: 1 };
    case 'setMinTotal':
      return { ...state, minTotal: action.payload, page: 1 };
    case 'setMaxTotal':
      return { ...state, maxTotal: action.payload, page: 1 };
    case 'setStartDate':
      return { ...state, startDate: action.payload, page: 1 };
    case 'setEndDate':
      return { ...state, endDate: action.payload, page: 1 };
    case 'setSortDirection':
      return { ...state, sortDirection: action.payload, page: 1 };
    case 'setMinPrice':
      return { ...state, minPrice: action.payload, page: 1 };
    case 'setMaxPrice':
      return { ...state, maxPrice: action.payload, page: 1 };
    case 'setInStockOnly':
      return { ...state, inStockOnly: action.payload, page: 1 };
    case 'setPage':
      return { ...state, page: action.payload };
    case 'RESET_FILTERS':
      return initialFilterState;
    default:
      return state;
  }
}
