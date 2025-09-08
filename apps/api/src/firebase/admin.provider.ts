import { Provider } from '@nestjs/common';
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

export const FIREBASE_ADMIN_AUTH = 'FIREBASE_ADMIN_AUTH';

export const firebaseAdminAuthProvider: Provider<Auth> = {
  provide: FIREBASE_ADMIN_AUTH,
  useFactory: () => {
    const {
      FB_ADMIN_PROJECT_ID,
      FB_ADMIN_CLIENT_EMAIL,
      FB_ADMIN_PRIVATE_KEY,
      FIREBASE_AUTH_EMULATOR_HOST,
    } = process.env;

    if (!getApps().length) {
      if (FIREBASE_AUTH_EMULATOR_HOST) {
        // emulator: projectId is enough
        initializeApp({
          projectId: FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e',
        });
      } else if (FB_ADMIN_CLIENT_EMAIL && FB_ADMIN_PRIVATE_KEY) {
        // prod: service account from env
        initializeApp({
          credential: cert({
            projectId: FB_ADMIN_PROJECT_ID,
            clientEmail: FB_ADMIN_CLIENT_EMAIL,
            privateKey: FB_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        // fallback if running on GCP/Cloud Run with default creds
        initializeApp({ credential: applicationDefault() });
      }
    }

    return getAuth();
  },
};
