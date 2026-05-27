import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { IProduct } from '@common/types';
import { isDemoAdmin } from '../lib/demo-mode';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function useProductById(id?: string) {
  return useQuery<IProduct>({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      if (isDemoAdmin()) {
        const snap = await getDoc(doc(db, 'products', id));
        if (!snap.exists()) throw new Error('Product not found');
        return { id: snap.id, ...snap.data() } as IProduct;
      }
      const res = await axiosInstance.get(`/products/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}
