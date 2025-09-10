'use client';

import { useContext, useEffect, useMemo } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { getRedirectResult } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Ensure the redirect handler runs only once per page load
let didHandleRedirect = false;

/** What the hook returns: everything from context + a `loading` boolean. */
export type UseAuthReturn = AuthContextType & { loading: boolean };

/**
 * Access auth state & actions from AuthProvider.
 * Also runs a one-time Google redirect-result handler so that
 * signInWithRedirect flows (fallback when popup is blocked) complete
 * and a basic user doc is ensured in Firestore.
 */
export const useAuth = (): UseAuthReturn => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  useEffect(() => {
    // skip during SSR or unit tests, and ensure idempotence
    if (typeof window === 'undefined' || didHandleRedirect) return;
    didHandleRedirect = true;

    // Defer so it doesn't block the initial render
    queueMicrotask(async () => {
      try {
        const cred = await getRedirectResult(auth);
        if (!cred) return;

        // Ensure/merge a minimal user profile doc
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            email: cred.user.email ?? '',
            name: cred.user.displayName ?? '',
            photoURL: cred.user.photoURL ?? '',
            role: 'user',
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (e) {
        console.error('[useAuth] getRedirectResult error:', e);
      }
    });
  }, []);

  // Optional E2E bypass: if your tests set window.__E2E_ALLOW__ = true
  // we expose loading=false and isAuthReady=true to unblock queries.
  const e2eOverride =
    typeof window !== 'undefined' && (window as any).__E2E_ALLOW__ === true;

  return useMemo(
    () => ({
      ...context,
      isAuthReady: e2eOverride ? true : context.isAuthReady,
      loading: e2eOverride ? false : !context.isAuthReady,
    }),
    [context, e2eOverride],
  );
};
