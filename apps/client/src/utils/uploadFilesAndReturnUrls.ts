// src/utils/uploadFilesAndReturnUrls.ts
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadFilesAndReturnUrls(
  files: File[],
  folderPath: string,
): Promise<string[]> {
  // Generate an array of upload promises
  const uploadPromises = files.map((file) => {
    const fileName = `${Date.now()}_${file.name}`;
    const fileRef = ref(storage, `${folderPath}/${fileName}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        null, // optional progress callback
        reject,
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        },
      );
    });
  });

  // Wait for all uploads to complete
  return Promise.all(uploadPromises);
}
