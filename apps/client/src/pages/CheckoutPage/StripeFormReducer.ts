type FormData = {
  ownerName: string;
  passportId: string;
};

export type State = {
  clientSecret: string | null;
  loading: boolean;
  error: string | null;
};

export type Action =
  | { type: 'SET_CLIENT_SECRET'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

export const initialState: State = {
  clientSecret: null,
  loading: false,
  error: null,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_CLIENT_SECRET':
      return { ...state, clientSecret: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}
