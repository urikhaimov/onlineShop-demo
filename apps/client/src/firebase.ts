// src/firebase.ts
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getEnv } from '@common/utils';

const env = import.meta.env;
const clean = (v: string) => (v ?? '').trim().replace(/^"+|"+$/g, '');

// Raw envs
const apiKey = clean(getEnv('VITE_FIREBASE_API_KEY', { env }) as string);
const authDomain = clean(
  getEnv('VITE_FIREBASE_AUTH_DOMAIN', { env }) as string,
);
const projectId = clean(getEnv('VITE_FIREBASE_PROJECT_ID', { env }) as string);
const bucketEnv = clean(
  getEnv('VITE_FIREBASE_STORAGE_BUCKET', { env }) as string,
);
const senderId = clean(
  getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', { env }) as string,
);
const appId = clean(getEnv('VITE_FIREBASE_APP_ID', { env }) as string);

// Canonicalize bucket: if env is missing or ends with appspot.com, derive from projectId
const canonicalBucket =
  bucketEnv && !/\.appspot\.com$/i.test(bucketEnv)
    ? bucketEnv
    : `${projectId}.firebasestorage.app`;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket: canonicalBucket, // normalized
  messagingSenderId: senderId,
  appId,
} as const;

// Create (or reuse) the app
export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// 🔒 Pin storage to the EXACT bucket. No fallbacks.
export const storage = getStorage(firebaseApp, `gs://${canonicalBucket}`);

// --- Diagnostics (dev only)
if (import.meta.env.DEV) {
  console.log('[Firebase] projectId:', firebaseApp.options.projectId);
  console.log('[Firebase] storageBucket (env):', bucketEnv);
  console.log('[Firebase] storageBucket (canonical):', canonicalBucket);

  // should log: gs://<project>.firebasestorage.app/
  import('firebase/storage').then(({ ref }) =>
    console.log('[Firebase] storage root:', ref(storage, '').toString()),
  );
}
