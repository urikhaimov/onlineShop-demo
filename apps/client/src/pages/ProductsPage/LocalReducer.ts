import { IProduct } from '@common/types';
import { SortingState, ColumnFiltersState } from '@tanstack/react-table';

export interface State {
  products: IProduct[];
  loading: boolean;
  snackbarOpen: boolean;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  selectedCategory: string;
}

type Action =
  | { type: 'SET_PRODUCTS'; payload: IProduct[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SNACKBAR'; payload: boolean }
  | { type: 'SET_SORTING'; payload: SortingState }
  | { type: 'SET_FILTERS'; payload: ColumnFiltersState }
  | { type: 'SET_CATEGORY'; payload: string };

export const initialState: State = {
  products: [],
  loading: true,
  snackbarOpen: false,
  sorting: [],
  columnFilters: [],
  selectedCategory: 'all',
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SNACKBAR':
      return { ...state, snackbarOpen: action.payload };
    case 'SET_SORTING':
      return { ...state, sorting: action.payload };
    case 'SET_FILTERS':
      return { ...state, columnFilters: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    default:
      return state;
  }
}
