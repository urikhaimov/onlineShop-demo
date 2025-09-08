import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const {
  FB_ADMIN_TYPE,
  FB_ADMIN_PROJECT_ID,
  FB_ADMIN_PRIVATE_KEY,
  FB_ADMIN_CLIENT_EMAIL,
  FIREBASE_AUTH_EMULATOR_HOST,
} = process.env;

// In emulator we can get by with just projectId + applicationDefault()
// In prod, use the service account from envs you already have in .env
if (!getApps().length) {
  if (FIREBASE_AUTH_EMULATOR_HOST) {
    initializeApp({
      projectId: FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e',
    });
  } else if (FB_ADMIN_CLIENT_EMAIL && FB_ADMIN_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: FB_ADMIN_PROJECT_ID,
        clientEmail: FB_ADMIN_CLIENT_EMAIL,
        privateKey: FB_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    initializeApp({ credential: applicationDefault() });
  }
}

export const adminAuth = getAuth();
