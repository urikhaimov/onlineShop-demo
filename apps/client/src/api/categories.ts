import api from './axiosInstance';
import { isDemoAdmin } from '../lib/demo-mode';

export type Category = {
  id: string;
  name: string;
  order: number;
  imageUrl?: string | null;
};
export type CategoriesResult = { items: Category[]; total: number };

const CATEGORIES_PATH = isDemoAdmin()
  ? '/categories/publiclist'
  : '/categories';

export async function listCategories(params?: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<CategoriesResult> {
  const res = await api.get(CATEGORIES_PATH, { params });
  const data = res.data;
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data?.items ?? [], total: Number(data?.total ?? 0) };
}
