'use client';

import { useContext, useEffect } from 'react';
import { AuthContext, type AuthContextType } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { getRedirectResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Access auth state & actions from AuthProvider.
 * Also runs a one-time Google redirect-result handler so that
 * signInWithRedirect flows (fallback when popup is blocked) complete
 * and a basic user doc is ensured in Firestore.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Handle Google redirect result exactly once (first time any consumer mounts)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const cred = await getRedirectResult(auth);
        if (!cred || cancelled) return;

        // Ensure/merge a minimal user profile doc
        await setDoc(
          doc(db, 'users', cred.user.uid),
          {
            email: cred.user.email ?? '',
            name: cred.user.displayName ?? '',
            photoURL: cred.user.photoURL ?? '',
            role: 'user',
          },
          { merge: true },
        );

        // If your AuthContext exposes something like `reloadUser`, you could call it here.
        // (Left out intentionally to avoid type mismatches.)
      } catch (e) {
        console.error('[useAuth] getRedirectResult error:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return context;
};
