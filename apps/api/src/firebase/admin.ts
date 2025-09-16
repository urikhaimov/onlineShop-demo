// apps/api/src/firebase/admin.ts
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  App,
} from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

const {
  FB_ADMIN_PROJECT_ID,
  FB_ADMIN_CLIENT_EMAIL,
  FB_ADMIN_PRIVATE_KEY,
  FIREBASE_AUTH_EMULATOR_HOST,
  ADMIN_STORAGE_BUCKET,
  VITE_FIREBASE_STORAGE_BUCKET, // optional fallback if reused
} = process.env;

function normalizeBucket(b?: string, projectId?: string) {
  const fallback = projectId ? `${projectId}.appspot.com` : undefined;
  if (!b) return fallback!;
  return b
    .trim()
    .replace(/^gs:\/\//i, '')
    .replace(/\.firebasestorage\.app$/i, '.appspot.com');
}

export function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = FB_ADMIN_PROJECT_ID || 'onlinestoretemplate-59d3e';
  const storageBucket = normalizeBucket(
    ADMIN_STORAGE_BUCKET || VITE_FIREBASE_STORAGE_BUCKET,
    projectId,
  );

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

/** ✅ Export an Auth INSTANCE so call sites can do: adminAuth.verifyIdToken(...) */
export const adminAuth: Auth = getAuth(getAdminApp());

/** ✅ Default Storage bucket configured via initializeApp({ storageBucket }) */
export function getBucket() {
  return getStorage(getAdminApp()).bucket();
}
