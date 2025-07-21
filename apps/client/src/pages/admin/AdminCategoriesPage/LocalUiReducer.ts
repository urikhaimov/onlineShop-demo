// src/pages/admin/AdminCategoriesPage/LocalUiReducer.ts

export interface UIState {
  mobileDrawerOpen: boolean;
}

export const initialUIState: UIState = {
  mobileDrawerOpen: false,
};

type UIAction =
  | { type: 'OPEN_MOBILE_DRAWER' }
  | { type: 'CLOSE_MOBILE_DRAWER' }
  | { type: 'TOGGLE_MOBILE_DRAWER' };

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_MOBILE_DRAWER':
      return { ...state, mobileDrawerOpen: true };
    case 'CLOSE_MOBILE_DRAWER':
      return { ...state, mobileDrawerOpen: false };
    case 'TOGGLE_MOBILE_DRAWER':
      return { ...state, mobileDrawerOpen: !state.mobileDrawerOpen };
    default:
      return state;
  }
}
