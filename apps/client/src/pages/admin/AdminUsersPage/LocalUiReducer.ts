// AdminUsersPage/LocalUiReducer.ts

import { IUser as User } from '@common/types';
export interface UIState {
  mobileDrawerOpen: boolean;
  confirmOpen: boolean;
  selectedUser: User | null;
}

export const initialUIState: UIState = {
  mobileDrawerOpen: false,
  confirmOpen: false,
  selectedUser: null,
};

export type UIAction =
  | { type: 'OPEN_MOBILE_DRAWER' }
  | { type: 'CLOSE_MOBILE_DRAWER' }
  | { type: 'OPEN_CONFIRM'; payload: User }
  | { type: 'CLOSE_CONFIRM' };

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_MOBILE_DRAWER':
      return { ...state, mobileDrawerOpen: true };
    case 'CLOSE_MOBILE_DRAWER':
      return { ...state, mobileDrawerOpen: false };
    case 'OPEN_CONFIRM':
      return { ...state, confirmOpen: true, selectedUser: action.payload };
    case 'CLOSE_CONFIRM':
      return { ...state, confirmOpen: false, selectedUser: null };
    default:
      return state;
  }
}
