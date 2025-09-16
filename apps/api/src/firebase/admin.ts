// apps/api/src/firebase/admin.ts
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { Auth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import type { Bucket } from '@google-cloud/storage';

const {
  FB_ADMIN_PROJECT_ID,
  FB_ADMIN_CLIENT_EMAIL,
  FB_ADMIN_PRIVATE_KEY,
  FIREBASE_AUTH_EMULATOR_HOST,
  ADMIN_STORAGE_BUCKET,
  VITE_FIREBASE_STORAGE_BUCKET, // optional fallback if reused
  GCLOUD_PROJECT,
  GOOGLE_CLOUD_PROJECT,
  // set to "false" ONLY if you intentionally want the Storage emulator
  FORCE_DISABLE_STORAGE_EMULATOR = 'true',
} = process.env;

/** Strip gs:// and whitespace; keep domain as-is (supports .firebasestorage.app). */
function cleanBucketName(b?: string) {
  return (b || '').trim().replace(/^gs:\/\//i, '');
}

function resolveProjectId(app?: App): string {
  return (
    FB_ADMIN_PROJECT_ID ||
    (app?.options?.projectId as string | undefined) ||
    GCLOUD_PROJECT ||
    GOOGLE_CLOUD_PROJECT ||
    'onlinestoretemplate-59d3e'
  );
}

/** Prefer env bucket; otherwise default to modern ".firebasestorage.app". */
function resolveBucketName(app?: App): string | undefined {
  const pid = resolveProjectId(app);
  const fromEnv = cleanBucketName(
    ADMIN_STORAGE_BUCKET || VITE_FIREBASE_STORAGE_BUCKET,
  );
  return fromEnv || (pid ? `${pid}.firebasestorage.app` : undefined);
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = resolveProjectId();
  const storageBucket = resolveBucketName();

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

/** Export an Auth INSTANCE (backward compatible with existing usage). */
export const adminAuth: Auth = getAuth(getAdminApp());

/**
 * Always returns a valid bucket. If emulator envs are present but
 * FORCE_DISABLE_STORAGE_EMULATOR !== 'false', we bypass them just for Storage.
 */
export function adminBucket(name?: string): Bucket {
  const app = getAdminApp();
  const desiredName = cleanBucketName(
    name || (app.options as any)?.storageBucket || resolveBucketName(app),
  )!;

  const bypassEmu = (FORCE_DISABLE_STORAGE_EMULATOR ?? 'true') !== 'false';
  if (bypassEmu) {
    const prevStorage = process.env.STORAGE_EMULATOR_HOST;
    const prevFirebase = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    delete process.env.STORAGE_EMULATOR_HOST;
    delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

    const bucket = getStorage(app).bucket(desiredName) as unknown as Bucket;

    if (prevStorage !== undefined)
      process.env.STORAGE_EMULATOR_HOST = prevStorage;
    if (prevFirebase !== undefined)
      process.env.FIREBASE_STORAGE_EMULATOR_HOST = prevFirebase;

    return bucket;
  }

  return getStorage(app).bucket(desiredName) as unknown as Bucket;
}

/** Back-compat alias so older imports keep working. */
export const getBucket = adminBucket;
