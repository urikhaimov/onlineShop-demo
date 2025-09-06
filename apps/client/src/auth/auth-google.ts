// src/auth/auth-google.ts
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
  linkWithCredential,
  setPersistence,
  browserLocalPersistence,
  type AuthError,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

async function ensureUserDoc(
  uid: string,
  data: Partial<{
    email: string;
    name: string;
    photoURL: string;
    role: string;
  }> = {},
) {
  await setDoc(
    doc(db, 'users', uid),
    { role: 'user', ...data },
    { merge: true },
  );
}

function wantsRedirectFallback(code?: string) {
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  );
}

/**
 * Call this for your "Sign in with Google" button.
 * - Tries popup first
 * - On popup issues => falls back to redirect
 * - If the same email already exists as password, it links Google to that account.
 */
export async function signInWithGoogleOrLink(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await setPersistence(auth, browserLocalPersistence);

  try {
    const cred = await signInWithPopup(auth, provider);
    await ensureUserDoc(cred.user.uid, {
      email: cred.user.email ?? '',
      name: cred.user.displayName ?? '',
      photoURL: cred.user.photoURL ?? '',
    });
    return;
  } catch (e: any) {
    const err = e as AuthError & { customData?: any };
    console.warn('[GoogleSignIn] popup path failed:', err.code);

    // 1) Popup blocked/closed → use redirect
    if (wantsRedirectFallback(err.code)) {
      await signInWithRedirect(auth, provider);
      return;
    }

    // 2) Same email already exists with another provider (likely 'password')
    if (err.code === 'auth/account-exists-with-different-credential') {
      const email = err.customData?.email as string | undefined;
      const pendingCred = GoogleAuthProvider.credentialFromError(err);
      if (!email || !pendingCred) throw err;

      const methods = await fetchSignInMethodsForEmail(auth, email);

      if (methods.includes('password')) {
        // Simple prompt for dev; swap with your own password modal if you want
        const pw = window.prompt(
          `The email ${email} already has a password account.\nEnter the password once to link Google to it:`,
        );
        if (!pw) throw new Error('Password required to link accounts.');

        const emailCred = await signInWithEmailAndPassword(auth, email, pw);
        await linkWithCredential(emailCred.user, pendingCred);
        await ensureUserDoc(emailCred.user.uid, {
          email: emailCred.user.email ?? '',
          name: emailCred.user.displayName ?? '',
          photoURL: emailCred.user.photoURL ?? '',
        });
        return;
      }

      alert(
        `This email is already used by: ${methods.join(
          ', ',
        )}. Sign in with that provider first, then link Google from your profile.`,
      );
      throw err;
    }

    // 3) Anything else → surface
    throw err;
  }
}

/** Call once on app load to complete redirect-based sign-in */
export async function handleGoogleRedirectResultOnce() {
  const cred = await getRedirectResult(auth);
  if (cred?.user) {
    await ensureUserDoc(cred.user.uid, {
      email: cred.user.email ?? '',
      name: cred.user.displayName ?? '',
      photoURL: cred.user.photoURL ?? '',
    });
  }
}
