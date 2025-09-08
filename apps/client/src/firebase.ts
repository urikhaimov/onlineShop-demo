// src/firebase.ts
import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getEnv } from '@common/utils';

const env = import.meta.env as Record<string, string | undefined>;
const clean = (v: string | undefined) =>
  (v ?? '').trim().replace(/^"+|"+$/g, '');

// ---- Raw envs ---------------------------------------------------------------
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

// ✅ Bucket must be the gs bucket name (default: <projectId>.appspot.com)
const storageBucket = bucketEnv || `${projectId}.appspot.com`;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket, // keep this here so SDK knows the default bucket
  messagingSenderId: senderId,
  appId,
} as const;

// ---- App / SDKs -------------------------------------------------------------
export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Pin storage to the EXACT bucket (gs://<bucket>)
export const storage = getStorage(firebaseApp, `gs://${storageBucket}`);

// ---- Emulators --------------------------------------------------------------
export const isEmulator =
  (env.VITE_USE_FIREBASE_EMULATOR || '').toLowerCase() === '1' ||
  (env.VITE_USE_FIREBASE_EMULATOR || '').toLowerCase() === 'true';

if (isEmulator) {
  // Auth
  try {
    const authHost =
      env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
      env.FIREBASE_AUTH_EMULATOR_HOST ||
      '127.0.0.1:9099';
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    if (import.meta.env.DEV)
      console.log('[Firebase] 🔌 Auth emulator:', authHost);
  } catch {
    /* HMR double-connect ok */
  }

  // Firestore
  try {
    const fsHost =
      env.VITE_FIRESTORE_EMULATOR_HOST ||
      env.FIRESTORE_EMULATOR_HOST ||
      '127.0.0.1:8080';
    const [host, portStr] = fsHost.split(':');
    connectFirestoreEmulator(db, host, Number(portStr || 8080));
    if (import.meta.env.DEV)
      console.log('[Firebase] 🔌 Firestore emulator:', fsHost);
  } catch {
    /* noop */
  }

  // Storage
  try {
    const stHost =
      env.VITE_FIREBASE_STORAGE_EMULATOR_HOST ||
      env.FIREBASE_STORAGE_EMULATOR_HOST ||
      '127.0.0.1:9199';
    const [host, portStr] = stHost.split(':');
    connectStorageEmulator(storage, host, Number(portStr || 9199));
    if (import.meta.env.DEV)
      console.log('[Firebase] 🔌 Storage emulator:', stHost);
  } catch {
    /* noop */
  }
}

// 🔐 keep user signed in across reloads (especially useful with emulator)
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* ignore on SSR/HMR */
});

// ---- Dev Diagnostics --------------------------------------------------------
if (import.meta.env.DEV) {
  console.log('[Firebase] projectId:', firebaseApp.options.projectId);
  console.log('[Firebase] storageBucket (env):', bucketEnv);
  console.log('[Firebase] storageBucket (resolved):', storageBucket);

  // should log: gs://<project-id>.appspot.com/
  import('firebase/storage').then(({ ref }) =>
    console.log('[Firebase] storage root:', ref(storage, '').toString()),
  );

  (window as any).auth = auth;
}
