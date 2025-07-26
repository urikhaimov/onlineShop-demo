// reducer/categoryReducer.ts
export interface CategoryState {
  newCategory: string;
  editingId: string | null;
  editName: string;
  errorMessage: string;
}

export type CategoryAction =
  | { type: 'SET_NEW'; payload: string }
  | { type: 'SET_EDIT'; payload: { id: string; name: string } }
  | { type: 'SET_EDIT_NAME'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_EDIT' }
  | { type: 'RESET_NEW' };

export const initialCategoryState: CategoryState = {
  newCategory: '',
  editingId: null,
  editName: '',
  errorMessage: '',
};

export function categoryReducer(
  state: CategoryState,
  action: CategoryAction,
): CategoryState {
  switch (action.type) {
    case 'SET_NEW':
      return { ...state, newCategory: action.payload };
    case 'SET_EDIT':
      return {
        ...state,
        editingId: action.payload.id,
        editName: action.payload.name,
      };
    case 'SET_EDIT_NAME':
      return { ...state, editName: action.payload };
    case 'SET_ERROR':
      return { ...state, errorMessage: action.payload };
    case 'CLEAR_EDIT':
      return { ...state, editingId: null, editName: '' };
    case 'RESET_NEW':
      return { ...state, newCategory: '', errorMessage: '' };
    default:
      return state;
  }
}
