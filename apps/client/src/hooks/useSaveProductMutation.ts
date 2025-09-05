// src/hooks/useSaveProductMutation.ts
import { useMutation } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { auth, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { IProduct } from '@common/types';

export type SaveProductArgs = {
  productId?: string;
  mode: 'add' | 'edit';
  data: {
    name: string;
    description: string;
    price: number | string;
    stock: number | string;
    categoryId: string;
  };
  images: { id: string; url: string; type: 'existing' | 'new'; file?: File }[];
  deletedImageIds: string[]; // handled elsewhere; not sent unless your API supports it
};

// Small helper so we never send blob: urls
function isHttpUrl(u: string) {
  return u.startsWith('https://') || u.startsWith('http://');
}

export function useSaveProductMutation() {
  return useMutation<IProduct, Error, SaveProductArgs>({
    mutationKey: ['saveProduct'],
    mutationFn: async (args) => {
      const user = auth.currentUser;
      const token = await user?.getIdToken?.();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      };

      // 1) Keep existing HTTP urls only
      const existingUrls = args.images
        .filter((i) => i.type === 'existing' && isHttpUrl(i.url))
        .map((i) => i.url);

      // 2) Upload new files and collect HTTPS download URLs
      const newFiles = args.images.filter((i) => i.type === 'new' && i.file);

      const uploadPromises = newFiles.map(async (img, idx) => {
        const file = img.file!;
        const fileName = `${Date.now()}_${idx}_${file.name}`;
        // Use productId folder when editing; a generic folder when adding
        const folder = args.productId ?? 'misc';
        const objectRef = ref(storage, `products/${folder}/${fileName}`);
        const task = uploadBytesResumable(objectRef, file, {
          contentType: file.type,
        });
        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            () => {
              //todo
            }, // you can report progress here if you like
            reject,
            () => resolve(),
          );
        });
        return await getDownloadURL(task.snapshot.ref);
      });

      const newUrls = await Promise.all(uploadPromises);

      // 3) Final images (dedup just in case)
      const finalUrls = Array.from(new Set([...existingUrls, ...newUrls]));

      // 4) Prepare payload (cast numbers properly)
      const payload = {
        name: args.data.name ?? '',
        description: args.data.description ?? '',
        price:
          typeof args.data.price === 'string'
            ? Number(args.data.price)
            : args.data.price,
        stock:
          typeof args.data.stock === 'string'
            ? Number(args.data.stock)
            : args.data.stock,
        categoryId: args.data.categoryId ?? '',
        images: finalUrls,
        imageUrl: finalUrls[0] ?? null,
      };

      // Helpful debug (dev only)
      if (import.meta.env.DEV) {
        console.log('[saveProduct] payload →', payload);
      }

      try {
        if (args.mode === 'add') {
          const { data } = await api.post<IProduct>('/products', payload, {
            headers,
          });
          return data;
        }

        if (!args.productId) {
          throw new Error('Missing productId for edit');
        }

        const { data } = await api.put<IProduct>(
          `/products/${args.productId}`,
          payload,
          { headers },
        );
        return data;
      } catch (err: any) {
        // Surface server validation errors
        const status = err?.response?.status;
        const body = err?.response?.data;

        console.error('Failed to save product:', status, body);
        const message =
          body?.message ??
          body?.error ??
          (typeof body === 'string' ? body : 'Request failed');
        throw new Error(`Save failed (${status ?? 'unknown'}): ${message}`);
      }
    },
  });
}
