// apps/api/src/firebase/admin.provider.ts
import type { Provider } from '@nestjs/common';
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export const FIREBASE_ADMIN_AUTH = 'FIREBASE_ADMIN_AUTH';

function ensureAdminInitialized() {
  const {
    FB_ADMIN_PROJECT_ID,
    FB_ADMIN_CLIENT_EMAIL,
    FB_ADMIN_PRIVATE_KEY,
    FIREBASE_AUTH_EMULATOR_HOST,
    ADMIN_STORAGE_BUCKET, // server env
    VITE_FIREBASE_STORAGE_BUCKET, // optional fallback if reused
  } = process.env;

  const projectId = FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e';

  const normalizeBucket = (b?: string) =>
    (b || '').trim().replace(/^gs:\/\//i, '');

  const storageBucket =
    normalizeBucket(ADMIN_STORAGE_BUCKET || VITE_FIREBASE_STORAGE_BUCKET) ||
    `${projectId}.firebasestorage.app`;

  if (!getApps().length) {
    if (FIREBASE_AUTH_EMULATOR_HOST) {
      // Emulator branch — still pass storageBucket so getStorage().bucket() has a default
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
}

export const firebaseAdminAuthProvider: Provider = {
  provide: FIREBASE_ADMIN_AUTH,
  useFactory: () => {
    ensureAdminInitialized();
    return getAuth();
  },
};

// Back-compat alias (some modules import this name)
export const FirebaseAdminProvider = firebaseAdminAuthProvider;
