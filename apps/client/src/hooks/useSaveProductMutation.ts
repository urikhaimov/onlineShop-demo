// src/hooks/useSaveProductMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosInstance';
import { auth, storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import type { IProduct } from '@common/types';

export type CombinedImageForSave = {
  id?: string;
  url?: string; // may be https://… or blob:…
  type?: 'existing' | 'new';
  file?: File;
};

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
  images: Array<string | CombinedImageForSave>; // allow strings or objects
  deletedImageIds: string[];
};

const isHttp = (u: string) => /^https?:\/\//i.test(u);
const isBlob = (u: string) => u.startsWith('blob:');
const isGs = (u: string) => u.startsWith('gs://');

function toNumber(n: number | string): number {
  return typeof n === 'string' ? Number(n) : n;
}

async function fileFromBlobUrl(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  const type = blob.type || 'image/jpeg';
  return new File([blob], name, { type });
}

async function uploadFileToFolder(file: File, folder: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const objectRef = ref(storage, `products/${folder}/${name}`);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(objectRef, file, {
      contentType: file.type,
    });
    task.on('state_changed', undefined, reject, () => resolve());
  });
  return await getDownloadURL(objectRef);
}

/** Normalize ONE entry (string or object) into a final HTTPS download URL. */
async function normalizeImage(
  entry: string | CombinedImageForSave,
  folder: string,
): Promise<string | null> {
  // 1) string
  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) return null;

    if (isHttp(url)) return url;
    if (isBlob(url)) {
      const f = await fileFromBlobUrl(url, `image_${Date.now()}.jpg`);
      return await uploadFileToFolder(f, folder);
    }
    if (isGs(url)) {
      const r = ref(storage, url);
      return await getDownloadURL(r);
    }
    console.warn(
      '[saveProduct] skipped string image (unrecognized scheme):',
      url,
    );
    return null;
  }

  // 2) object with file
  if (entry?.file instanceof File) {
    return await uploadFileToFolder(entry.file, folder);
  }

  // 3) object with url
  const url = String(entry?.url ?? '').trim();
  if (!url) return null;
  if (isHttp(url)) return url;
  if (isBlob(url)) {
    const f = await fileFromBlobUrl(url, `image_${Date.now()}.jpg`);
    return await uploadFileToFolder(f, folder);
  }
  if (isGs(url)) {
    const r = ref(storage, url);
    return await getDownloadURL(r);
  }

  console.warn('[saveProduct] skipped image (unknown shape):', entry);
  return null;
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation<IProduct, Error, SaveProductArgs>({
    mutationKey: ['saveProduct'],
    mutationFn: async (args) => {
      const user = auth.currentUser;
      const token = await user?.getIdToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const folder = args.productId ?? 'misc';

      if (import.meta.env.DEV) {
        console.log('[saveProduct] args.images length =', args.images?.length);
        console.log('[saveProduct] args.images =', args.images);
      }

      // Normalize every entry → final HTTPS URL (keep order)
      const finalImages: string[] = [];
      for (let i = 0; i < (args.images ?? []).length; i++) {
        try {
          const url = await normalizeImage(args.images[i], folder);
          if (url) finalImages.push(url);
        } catch (e) {
          console.error('[saveProduct] failed to process image #', i, e);
        }
      }

      if (import.meta.env.DEV) {
        console.log('[saveProduct] finalImages length =', finalImages.length);
        console.log('[saveProduct] finalImages =', finalImages);
      }

      const payload = {
        name: args.data.name ?? '',
        description: args.data.description ?? '',
        price: toNumber(args.data.price),
        stock: toNumber(args.data.stock),
        categoryId: args.data.categoryId ?? '',
        images: finalImages,
        imageUrl: finalImages[0] ?? null,
      };

      if (import.meta.env.DEV) console.log('[saveProduct] payload →', payload);

      if (args.mode === 'add') {
        const { data } = await api.post<IProduct>('/products', payload, {
          headers,
        });
        return data;
      }

      if (!args.productId) throw new Error('Missing productId for edit');

      const { data } = await api.put<IProduct>(
        `/products/${args.productId}`,
        payload,
        {
          headers,
        },
      );
      return data;
    },

    // 🔁 make UI reflect new images without hard reload
    onSuccess: (saved, vars) => {
      // Update the detailed product cache with the response
      queryClient.setQueryData<IProduct>(['product', saved.id], saved);

      // Invalidate product lists (and any other views) to refetch
      queryClient.invalidateQueries({ queryKey: ['products'] });

      if (vars.productId) {
        queryClient.invalidateQueries({
          queryKey: ['product', vars.productId],
        });
      }
    },
  });
}
