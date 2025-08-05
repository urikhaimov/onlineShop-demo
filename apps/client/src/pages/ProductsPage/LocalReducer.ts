import { IProduct } from '@common/types';
import { Dayjs } from 'dayjs';

export interface State {
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
  sorting: any;
  columnFilters: any;
  snackbarOpen: boolean;
}

export const initialState: State = {
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
};

export type Action =
  | { type: 'SET_PRODUCTS'; payload: IProduct[] }
  | { type: 'ADD_PRODUCTS'; payload: IProduct[] }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'SET_LAST_DOC'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_CREATED_AFTER'; payload: Dayjs | null }
  | { type: 'SET_MIN_PRICE'; payload: number }
  | { type: 'SET_MAX_PRICE'; payload: number }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_PAGE_SIZE'; payload: number }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string }
  | { type: 'SET_PENDING_DELETE'; payload: IProduct | null }
  | { type: 'SET_REORDER_PENDING'; payload: boolean }
  | { type: 'SET_SORTING'; payload: any }
  | { type: 'SET_FILTERS'; payload: any }
  | { type: 'SET_SNACKBAR'; payload: boolean };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCTS':
      return { ...state, products: [...state.products, ...action.payload] };
    case 'REMOVE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
      };
    case 'SET_LAST_DOC':
      return { ...state, lastDoc: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_CATEGORY_FILTER':
      return { ...state, selectedCategoryId: action.payload };
    case 'SET_CREATED_AFTER':
      return { ...state, createdAfter: action.payload };
    case 'SET_MIN_PRICE':
      return { ...state, minPrice: action.payload };
    case 'SET_MAX_PRICE':
      return { ...state, maxPrice: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload };
    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload };
    case 'SET_PENDING_DELETE':
      return { ...state, pendingDelete: action.payload };
    case 'SET_REORDER_PENDING':
      return { ...state, reorderPending: action.payload };
    case 'SET_SORTING':
      return { ...state, sorting: action.payload };
    case 'SET_FILTERS':
      return { ...state, columnFilters: action.payload };
    case 'SET_SNACKBAR':
      return { ...state, snackbarOpen: action.payload };
    default:
      return state;
  }
}
