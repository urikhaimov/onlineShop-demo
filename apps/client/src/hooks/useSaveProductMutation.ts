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
    categoryId: string; // REQUIRED
  };
  images: Array<string | CombinedImageForSave>;
  deletedImageIds: string[]; // optional: only useful on edit
};

const isHttp = (u: string) => /^https?:\/\//i.test(u);
const isBlob = (u: string) => u.startsWith('blob:');
const isGs = (u: string) => u.startsWith('gs://');

function toNumber(n: number | string, fallback = 0): number {
  const v = typeof n === 'string' ? Number(n) : n;
  return Number.isFinite(v) ? v : fallback;
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
  return getDownloadURL(objectRef);
}

/** Normalize ONE entry (string or object) into a final HTTPS download URL. */
async function normalizeImage(
  entry: string | CombinedImageForSave,
  folder: string,
): Promise<string | null> {
  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) return null;
    if (isHttp(url)) return url;
    if (isBlob(url))
      return uploadFileToFolder(
        await fileFromBlobUrl(url, `image_${Date.now()}.jpg`),
        folder,
      );
    if (isGs(url)) return getDownloadURL(ref(storage, url));
    console.warn(
      '[saveProduct] skipped string image (unrecognized scheme):',
      url,
    );
    return null;
  }

  if (entry?.file instanceof File) {
    return uploadFileToFolder(entry.file, folder);
  }

  const url = String(entry?.url ?? '').trim();
  if (!url) return null;
  if (isHttp(url)) return url;
  if (isBlob(url))
    return uploadFileToFolder(
      await fileFromBlobUrl(url, `image_${Date.now()}.jpg`),
      folder,
    );
  if (isGs(url)) return getDownloadURL(ref(storage, url));

  console.warn('[saveProduct] skipped image (unknown shape):', entry);
  return null;
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation<IProduct, Error, SaveProductArgs>({
    mutationKey: ['saveProduct'],
    mutationFn: async (args) => {
      // Guard: categoryId is required
      if (!args?.data?.categoryId) {
        throw new Error('בחר קטגוריה (categoryId is required).');
      }

      const user = auth.currentUser;
      const token = await user?.getIdToken?.();
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      // Prefer a stable folder per product. For new products use user UID or a temp bucket.
      const folder = args.productId ?? user?.uid ?? 'tmp';

      if (import.meta.env.DEV) {
        console.log('[saveProduct] images:', args.images?.length, args.images);
      }

      // Parallelize image processing
      const normalized = await Promise.all(
        (args.images ?? []).map((e, i) =>
          normalizeImage(e, folder).catch((err) => {
            console.error('[saveProduct] image normalize failed #', i, err);
            return null;
          }),
        ),
      );
      const finalImages = normalized.filter((x): x is string => Boolean(x));

      const payload: any = {
        name: args.data.name ?? '',
        description: args.data.description ?? '',
        price: toNumber(args.data.price, 0),
        stock: toNumber(args.data.stock, 0),
        categoryId: args.data.categoryId,
        images: finalImages,
        imageUrl: finalImages[0] ?? null,
      };

      // If you handle deletion on the server during EDIT
      if (args.mode === 'edit' && args.deletedImageIds?.length) {
        payload.deletedImageIds = args.deletedImageIds;
      }

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
        { headers },
      );
      return data;
    },

    onSuccess: (saved, vars) => {
      // Update specific product cache
      queryClient.setQueryData<IProduct>(['product', saved.id], saved);
      // Refresh lists (respects filters like categoryId on the query keys)
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (vars.productId) {
        queryClient.invalidateQueries({
          queryKey: ['product', vars.productId],
        });
      }
    },
  });
}
