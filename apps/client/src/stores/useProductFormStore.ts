// src/stores/useProductFormStore.ts
import { create } from 'zustand';
import { CombinedImage } from '../components/ImageUploader';
import { IProduct, TCategory } from '@common/types';

interface ProductFormState {
  product: IProduct | null;
  combinedImages: CombinedImage[];
  isUploadingImages: boolean;
  categories: TCategory[];
  showSuccessSnackbar: boolean;
  showLimitSnackbar: boolean;
  ready: boolean;
  deletedImageIds: string[];
}

interface ProductFormActions {
  setProduct: (product: IProduct) => void;
  setCategories: (categories: TCategory[]) => void;
  setCombinedImages: (images: CombinedImage[]) => void;
  addCombinedImages: (images: CombinedImage[]) => void;
  setUploadProgress: (id: string, progress: number) => void;
  setUploadingImages: (isUploading: boolean) => void;
  setShowSuccessSnackbar: (show: boolean) => void;
  setShowLimitSnackbar: (show: boolean) => void;
  setReady: (ready: boolean) => void;
  addDeletedImageId: (id: string) => void;
  reset: () => void;
}

const initialState: ProductFormState = {
  product: null,
  combinedImages: [],
  isUploadingImages: false,
  categories: [],
  showSuccessSnackbar: false,
  showLimitSnackbar: false,
  ready: false,
  deletedImageIds: [],
};

export const useProductFormStore = create<
  ProductFormState & ProductFormActions
>((set) => ({
  ...initialState,

  setProduct: (product) => set({ product }),
  setCategories: (categories) => set({ categories }),
  setCombinedImages: (images) => set({ combinedImages: images }),
  addCombinedImages: (images) =>
    set((state) => ({ combinedImages: [...state.combinedImages, ...images] })),
  setUploadProgress: (id, progress) =>
    set((state) => ({
      combinedImages: state.combinedImages.map((img) =>
        img.id === id ? { ...img, progress } : img,
      ),
    })),
  setUploadingImages: (isUploading) => set({ isUploadingImages: isUploading }),
  setShowSuccessSnackbar: (show) => set({ showSuccessSnackbar: show }),
  setShowLimitSnackbar: (show) => set({ showLimitSnackbar: show }),
  setReady: (ready) => set({ ready }),
  addDeletedImageId: (id) =>
    set((state) => ({ deletedImageIds: [...state.deletedImageIds, id] })),
  reset: () => set(initialState),
}));
