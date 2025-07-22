import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getEnv } from '@common/utils';

const env = import.meta.env;
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', { env }) as string,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', { env }) as string,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', { env }) as string,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', { env }) as string,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', {
    env,
  }) as string,
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID', { env }) as string,
  appId: getEnv('VITE_FIREBASE_APP_ID', { env }) as string,
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(
  firebaseApp,
  'gs://onlinestoretemplate-59d3e',
);
