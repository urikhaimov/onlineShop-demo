// scripts/storage-smoke.mjs
// Smoke test for Firebase emulators (Auth + Storage).

// --- Force emulator hosts immediately (belt + suspenders)
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import fs from 'node:fs';

const projectId = 'onlinestoretemplate-59d3e';
const EMAIL = process.env.SMOKE_EMAIL || 'urikhaimov@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin777';

console.log('[smoke] starting');
console.log('[smoke] email                     :', EMAIL);
console.log(
  '[smoke] FIREBASE_AUTH_EMULATOR_HOST   =',
  process.env.FIREBASE_AUTH_EMULATOR_HOST,
);
console.log(
  '[smoke] FIREBASE_STORAGE_EMULATOR_HOST=',
  process.env.FIREBASE_STORAGE_EMULATOR_HOST,
);

const app = initializeApp({
  apiKey: 'demo',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: `${projectId}.firebasestorage.app`,
  appId: 'demo',
});

const auth = getAuth(app);
const storage = getStorage(app);

// Explicitly connect (even with env present)
connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, {
  disableWarnings: true,
});
{
  const [shost, sport] = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':');
  connectStorageEmulator(storage, shost, Number(sport || 9199));
}

function fileBuf() {
  try {
    return fs.readFileSync('./README.md');
  } catch {
    return Buffer.from('hello from storage-smoke\n');
  }
}

async function ensureUser(email, password) {
  console.log('[smoke] checking sign-in methods…');
  const methods = await fetchSignInMethodsForEmail(auth, email);
  console.log('[smoke] methods for email:', methods);

  try {
    console.log('[smoke] trying signInWithEmailAndPassword…');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('[smoke] signed in');
  } catch (e) {
    const code = e?.code || e?.message;
    console.log('[smoke] sign-in failed with:', code);

    if (
      String(code).includes('user-not-found') ||
      String(code).includes('invalid-credential')
    ) {
      console.log('[smoke] creating user then retrying sign-in…');
      await createUserWithEmailAndPassword(auth, email, password);
      await signInWithEmailAndPassword(auth, email, password);
      console.log('[smoke] created + signed in');
    } else if (String(code).includes('wrong-password')) {
      console.log('[smoke] wrong password for existing emulator user.');
      console.log(
        '        Fix: change SMOKE_PASSWORD or delete the user in the Emulator UI and rerun.',
      );
      throw e;
    } else {
      throw e;
    }
  }
}

(async function main() {
  await ensureUser(EMAIL, PASSWORD);

  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('No auth.currentUser after sign-in');

  // Your rules require image/* under avatars → write as a "png"
  const avatarKey = `avatars/${uid}/avatar.png`;
  console.log('[smoke] uploading to (avatars):', avatarKey);

  try {
    const r = ref(storage, avatarKey);
    await uploadBytes(r, fileBuf(), { contentType: 'image/png' });
    const url = await getDownloadURL(r);
    console.log('[smoke] download URL (avatars):', url);
    console.log('✅ Storage smoke test completed');
  } catch (e) {
    const code = e?.code || e?.message || '';
    console.log('[smoke] avatar upload failed with:', code);

    // Fallback path that your rules allow for any content type < 20MB
    if (
      String(code).includes('storage/unauthorized') ||
      String(code).includes('permission')
    ) {
      const tempKey = `temp/${uid}/smoke.txt`;
      console.log('[smoke] retrying to (temp):', tempKey);
      const r2 = ref(storage, tempKey);
      await uploadBytes(r2, fileBuf(), { contentType: 'text/plain' });
      const url2 = await getDownloadURL(r2);
      console.log('[smoke] download URL (temp):', url2);
      console.log('✅ Storage smoke test completed (via temp fallback)');
    } else {
      throw e;
    }
  }
})().catch((e) => {
  console.error('❌ storage-smoke failed:', e?.code || e?.message || e);
  process.exitCode = 1;
});
