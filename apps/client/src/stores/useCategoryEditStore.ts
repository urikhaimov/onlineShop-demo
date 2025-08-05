// src/stores/useCategoryEditStore.ts
import { create } from 'zustand';

interface CategoryEditState {
  newCategory: string;
  editingId: string | null;
  editName: string;
  errorMessage: string;

  setNewCategory: (value: string) => void;
  startEdit: (id: string, name: string) => void;
  setEditName: (name: string) => void;
  setErrorMessage: (msg: string) => void;
  clearEdit: () => void;
  resetNew: () => void;
}

export const useCategoryEditStore = create<CategoryEditState>((set) => ({
  newCategory: '',
  editingId: null,
  editName: '',
  errorMessage: '',

  setNewCategory: (value) => set({ newCategory: value }),
  startEdit: (id, name) => set({ editingId: id, editName: name }),
  setEditName: (name) => set({ editName: name }),
  setErrorMessage: (msg) => set({ errorMessage: msg }),
  clearEdit: () => set({ editingId: null, editName: '' }),
  resetNew: () => set({ newCategory: '', errorMessage: '' }),
}));
