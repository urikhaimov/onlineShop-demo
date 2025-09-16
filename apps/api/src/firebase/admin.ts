// NEW or REPLACE
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const {
  FB_ADMIN_PROJECT_ID,
  FB_ADMIN_CLIENT_EMAIL,
  FB_ADMIN_PRIVATE_KEY,
  FIREBASE_AUTH_EMULATOR_HOST,
  ADMIN_STORAGE_BUCKET,
} = process.env;

function normalizeBucket(b?: string, projectId?: string) {
  const fallback = projectId ? `${projectId}.appspot.com` : undefined;
  if (!b) return fallback!;
  return b.replace(/\.firebasestorage\.app$/i, '.appspot.com');
}

export function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e';
  const storageBucket = normalizeBucket(ADMIN_STORAGE_BUCKET, projectId);

  const base = FIREBASE_AUTH_EMULATOR_HOST
    ? { projectId }
    : FB_ADMIN_CLIENT_EMAIL && FB_ADMIN_PRIVATE_KEY
      ? {
          credential: cert({
            projectId,
            clientEmail: FB_ADMIN_CLIENT_EMAIL,
            privateKey: FB_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId,
        }
      : { credential: applicationDefault(), projectId };

  return initializeApp({ ...base, storageBucket });
}

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function getBucket() {
  return getStorage(getAdminApp()).bucket(); // uses storageBucket from initializeApp
}
