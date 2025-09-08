// src/services/storage.ts
import { storage } from '../firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from 'firebase/storage';

/** Upload an avatar: avatars/{uid}/{filename}  (public read) */
export async function uploadAvatar(uid: string, file: File) {
  const key = `avatars/${uid}/${file.name}`;
  const metadata: UploadMetadata = { contentType: file.type || 'image/*' };
  const r = ref(storage, key);
  await uploadBytes(r, file, metadata);
  const url = await getDownloadURL(r);
  return { key, url };
}

/** Upload a product image: products/{productId}/{filename} (admin/superadmin write, public read) */
export async function uploadProductImage(productId: string, file: File) {
  const key = `products/${productId}/${file.name}`;
  const metadata: UploadMetadata = { contentType: file.type || 'image/*' };
  const r = ref(storage, key);
  await uploadBytes(r, file, metadata);
  const url = await getDownloadURL(r);
  return { key, url };
}

/** Upload temp file: temp/{uid}/{path} (owner-only, ≤20MB) */
export async function uploadTemp(uid: string, path: string, file: File) {
  const key = `temp/${uid}/${path}`;
  const r = ref(storage, key);
  await uploadBytes(r, file, {
    contentType: file.type || 'application/octet-stream',
  });
  const url = await getDownloadURL(r);
  return { key, url };
}

/** Optional: delete by full key */
export async function removeObject(key: string) {
  await deleteObject(ref(storage, key));
}
