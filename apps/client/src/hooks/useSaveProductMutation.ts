import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, storage } from '../firebase';
import { CombinedImage } from '../components/ImageUploader';

export interface SaveProductPayload {
  productId?: string;
  data: {
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: string;
  };
  images: CombinedImage[];
  deletedImageIds: string[];
  mode: 'add' | 'edit';
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      data,
      images,
      deletedImageIds,
      mode,
    }: SaveProductPayload) => {
      let productDocId = productId ?? '';
      if (mode === 'add' && !productDocId) {
        const newDocRef = doc(collection(db, 'products'));
        productDocId = newDocRef.id;
      }

      // Upload new images
      const newImages = images.filter((img) => img.type === 'new');
      const uploadedUrls = await Promise.all(
        newImages.map((img) => {
          if (!img.file) throw new Error('Missing file');
          const storageRef = ref(
            storage,
            `products/${productDocId}/${img.file.name}`,
          );
          const uploadTask = uploadBytesResumable(storageRef, img.file);
          return new Promise<string>((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            });
          });
        }),
      );

      const existingUrls = images
        .filter(
          (img) =>
            img.type === 'existing' &&
            !deletedImageIds.includes(img.id.replace('existing-', '')),
        )
        .map((img) => img.url);

      const allImageUrls = [...existingUrls, ...uploadedUrls];

      const productData = {
        ...data,
        images: allImageUrls,
        price: Number(data.price),
        stock: Number(data.stock),
        updatedAt: serverTimestamp(),
      };

      if (mode === 'edit' && productId) {
        await updateDoc(doc(db, 'products', productId), productData);
      } else {
        await setDoc(doc(db, 'products', productDocId), {
          ...productData,
          createdAt: serverTimestamp(),
        });
      }

      return productDocId;
    },

    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // optional
    },
  });
}
