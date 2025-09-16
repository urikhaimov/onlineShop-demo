// apps/api/src/firebase/admin.provider.ts
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const FirebaseAdminProvider = {
  provide: 'FIREBASE_ADMIN_AUTH',
  useFactory: () => {
    const {
      FB_ADMIN_PROJECT_ID,
      FB_ADMIN_CLIENT_EMAIL,
      FB_ADMIN_PRIVATE_KEY,
      FIREBASE_AUTH_EMULATOR_HOST,
      ADMIN_STORAGE_BUCKET, // <-- add this env
      VITE_FIREBASE_STORAGE_BUCKET, // optional fallback if you reused client envs
    } = process.env;

    const projectId = FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e';

    const normalizeBucket = (b?: string) =>
      (b || '')
        .trim()
        .replace(/^gs:\/\//i, '')
        .replace(/\.firebasestorage\.app$/i, '.appspot.com'); // guard against wrong domain

    const storageBucket =
      normalizeBucket(ADMIN_STORAGE_BUCKET || VITE_FIREBASE_STORAGE_BUCKET) ||
      `${projectId}.appspot.com`;

    if (!getApps().length) {
      if (FIREBASE_AUTH_EMULATOR_HOST) {
        // Emulator: still pass storageBucket so getStorage().bucket() has a default
        initializeApp({ projectId, storageBucket });
      } else if (FB_ADMIN_CLIENT_EMAIL && FB_ADMIN_PRIVATE_KEY) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail: FB_ADMIN_CLIENT_EMAIL,
            privateKey: FB_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
          storageBucket,
        });
      } else {
        initializeApp({
          credential: applicationDefault(),
          projectId,
          storageBucket,
        });
      }
    }

    return getAuth();
  },
};
