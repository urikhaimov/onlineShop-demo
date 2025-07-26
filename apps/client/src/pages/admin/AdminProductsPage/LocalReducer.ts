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
  page: number;
  pageSize: number;
  successMessage: string;
  pendingDelete: IProduct | null;
  reorderPending: boolean; // 🆕
}

export type Action =
  | { type: 'SET_PRODUCTS'; payload: IProduct[] }
  | { type: 'SET_PRODUCTS_SORTED'; payload: IProduct[] }
  | { type: 'ADD_PRODUCTS'; payload: IProduct[] }
  | { type: 'REMOVE_PRODUCT'; payload: string }
  | { type: 'SET_LAST_DOC'; payload: any }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_CREATED_AFTER'; payload: Dayjs | null }
  | { type: 'RESET_FILTERS' }
  | { type: 'INCREMENT_PAGE' }
  | { type: 'DECREMENT_PAGE' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_SUCCESS_MESSAGE'; payload: string }
  | { type: 'CLEAR_SUCCESS_MESSAGE' }
  | { type: 'SET_PENDING_DELETE'; payload: IProduct | null }
  | { type: 'SET_REORDER_PENDING'; payload: boolean } // 🆕
  | { type: 'RESET_PAGINATION'; payload: State };

export const initialState: State = {
  products: [],
  lastDoc: null,
  loading: false,
  hasMore: true,
  searchTerm: '',
  selectedCategoryId: '',
  createdAfter: null,
  page: 1,
  pageSize: 10,
  successMessage: '',
  pendingDelete: null,
  reorderPending: false, // 🆕
};

export function resetPagination(state: State): State {
  return {
    ...state,
    page: 1,
    products: [],
    lastDoc: null,
    hasMore: true,
    loading: false,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return {
        ...state,
        products: [...action.payload], // unsorted — used after reorder
      };
    case 'SET_PRODUCTS_SORTED':
      return {
        ...state,
        products: [...action.payload].sort(
          (a, b) => (a.order ?? 9999) - (b.order ?? 9999),
        ),
      };
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
      return { ...state, searchTerm: action.payload, page: 1 };
    case 'SET_CATEGORY_FILTER':
      return { ...state, selectedCategoryId: action.payload, page: 1 };
    case 'SET_CREATED_AFTER':
      return { ...state, createdAfter: action.payload, page: 1 };
    case 'RESET_FILTERS':
      return {
        ...state,
        searchTerm: '',
        selectedCategoryId: '',
        createdAfter: null,
        page: 1,
        successMessage: '',
        pendingDelete: null,
      };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'INCREMENT_PAGE':
      return { ...state, page: state.page + 1 };
    case 'DECREMENT_PAGE':
      return { ...state, page: Math.max(1, state.page - 1) };
    case 'SET_SUCCESS_MESSAGE':
      return { ...state, successMessage: action.payload };
    case 'CLEAR_SUCCESS_MESSAGE':
      return { ...state, successMessage: '' };
    case 'SET_PENDING_DELETE':
      return { ...state, pendingDelete: action.payload };
    case 'RESET_PAGINATION':
      return { ...action.payload };
    case 'SET_REORDER_PENDING':
      return { ...state, reorderPending: action.payload };
    default:
      return state;
  }
}
