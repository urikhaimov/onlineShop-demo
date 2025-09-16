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
const bucketRaw = clean(
  getEnv('VITE_FIREBASE_STORAGE_BUCKET', { env }) as string,
);
const senderId = clean(
  getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', { env }) as string,
);
const appId = clean(getEnv('VITE_FIREBASE_APP_ID', { env }) as string);

// ✅ Normalize bucket: strip gs:// and convert *.firebasestorage.app → *.appspot.com
const normalizeBucket = (b: string) =>
  (b || '')
    .replace(/^gs:\/\//i, '')
    .replace(/\.firebasestorage\.app$/i, '.appspot.com');

const storageBucket = normalizeBucket(bucketRaw) || `${projectId}.appspot.com`;

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket, // keep the default bucket in config
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
  try {
    const authHost =
      env.VITE_FIREBASE_AUTH_EMULATOR_HOST ||
      env.FIREBASE_AUTH_EMULATOR_HOST ||
      '127.0.0.1:9099';
    connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
    if (import.meta.env.DEV)
      console.log('[Firebase] 🔌 Auth emulator:', authHost);
  } catch {
    // ignore
  }

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
    // ignore
  }

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
    // ignore
  }
}

// 🔐 keep user signed in across reloads
setPersistence(auth, browserLocalPersistence).catch(() => {
  // ignore
});

// ---- Dev Diagnostics --------------------------------------------------------
if (import.meta.env.DEV) {
  console.log('[Firebase] projectId:', firebaseApp.options.projectId);
  console.log('[Firebase] storageBucket (env raw):', bucketRaw);
  console.log('[Firebase] storageBucket (resolved):', storageBucket);
  import('firebase/storage').then(({ ref }) =>
    console.log('[Firebase] storage root:', ref(storage, '').toString()),
  );
  (window as any).auth = auth;
}
