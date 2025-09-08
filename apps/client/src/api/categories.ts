import api from './axiosInstance';

export type Category = {
  id: string;
  name: string;
  order: number;
  imageUrl?: string | null;
};
export type CategoriesResult = { items: Category[]; total: number };

export async function listCategories(params?: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
}): Promise<CategoriesResult> {
  const res = await api.get('/categories', { params });
  const data = res.data;
  if (Array.isArray(data)) return { items: data, total: data.length };
  return { items: data?.items ?? [], total: Number(data?.total ?? 0) };
}
