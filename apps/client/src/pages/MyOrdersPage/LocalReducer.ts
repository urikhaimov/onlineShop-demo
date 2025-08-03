// ✅ Use shared Order type

export interface FilterState {
  searchTerm: string;
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
}

export type FilterAction =
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_DATE_FROM'; payload: string | null }
  | { type: 'SET_DATE_TO'; payload: string | null }
  | { type: 'SET_STATUS'; payload: string }
  | { type: 'RESET_FILTERS' };

export const initialFilterState: FilterState = {
  searchTerm: '',
  dateFrom: null,
  dateTo: null,
  status: '',
};

export function filterReducer(
  state: FilterState,
  action: FilterAction,
): FilterState {
  switch (action.type) {
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'SET_DATE_FROM':
      return { ...state, dateFrom: action.payload };
    case 'SET_DATE_TO':
      return { ...state, dateTo: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'RESET_FILTERS':
      return initialFilterState;
    default:
      return state;
  }
}
