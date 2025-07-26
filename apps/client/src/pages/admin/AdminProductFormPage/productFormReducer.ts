import { CombinedImage } from '../../../components/ImageUploader';
import { IProduct, TCategory } from '@common/types';

export interface ProductFormState {
  product: IProduct | null;
  combinedImages: CombinedImage[];
  isUploadingImages: boolean;
  categories: TCategory[];
  showSuccessSnackbar: boolean;
  showLimitSnackbar: boolean;
  ready: boolean;
  deletedImageIds: string[]; // ✅ Track deleted existing image URLs (without token)
}

export const initialProductFormState: ProductFormState = {
  product: null,
  combinedImages: [],
  isUploadingImages: false,
  categories: [],
  showSuccessSnackbar: false,
  showLimitSnackbar: false,
  ready: false,
  deletedImageIds: [], // ✅ Init to empty array
};

type Action =
  | { type: 'SET_PRODUCT'; payload: IProduct }
  | { type: 'SET_CATEGORIES'; payload: TCategory[] }
  | { type: 'SET_COMBINED_IMAGES'; payload: CombinedImage[] }
  | { type: 'ADD_COMBINED_IMAGES'; payload: CombinedImage[] }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { id: string; progress: number } }
  | { type: 'SET_UPLOADING_IMAGES'; payload: boolean }
  | { type: 'SET_SHOW_SUCCESS_SNACKBAR'; payload: boolean }
  | { type: 'SET_SHOW_LIMIT_SNACKBAR'; payload: boolean }
  | { type: 'SET_READY'; payload: boolean }
  | { type: 'ADD_DELETED_IMAGE_ID'; payload: string }; // ✅ NEW

export function productFormReducer(
  state: ProductFormState,
  action: Action,
): ProductFormState {
  switch (action.type) {
    case 'SET_PRODUCT':
      return { ...state, product: action.payload };

    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };

    case 'SET_COMBINED_IMAGES':
      return { ...state, combinedImages: action.payload };

    case 'ADD_COMBINED_IMAGES':
      return {
        ...state,
        combinedImages: [...state.combinedImages, ...action.payload],
      };

    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        combinedImages: state.combinedImages.map((img) =>
          img.id === action.payload.id
            ? { ...img, progress: action.payload.progress }
            : img,
        ),
      };

    case 'SET_UPLOADING_IMAGES':
      return { ...state, isUploadingImages: action.payload };

    case 'SET_SHOW_SUCCESS_SNACKBAR':
      return { ...state, showSuccessSnackbar: action.payload };

    case 'SET_SHOW_LIMIT_SNACKBAR':
      return { ...state, showLimitSnackbar: action.payload };

    case 'SET_READY':
      return { ...state, ready: action.payload };

    case 'ADD_DELETED_IMAGE_ID':
      return {
        ...state,
        deletedImageIds: [...state.deletedImageIds, action.payload],
      };

    default:
      return state;
  }
}
