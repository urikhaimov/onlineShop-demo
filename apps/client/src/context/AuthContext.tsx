'use client';

import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react';
import type { User } from 'firebase/auth';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth } from '../firebase';
import { EUserRole } from '@common/types';
import { defineAbilityFor } from '../services/ability.service';
import { runAllStoreResets } from '../state/resetRegistry';
import { useQueryClient } from '@tanstack/react-query';

/** Simple role helper exported for consumers (e.g., ability.service) */
export const isAdmin = (role: EUserRole | string | null | undefined): boolean =>
  role === EUserRole.ADMIN || role === 'admin' || role === 'ADMIN';

export type AuthContextType = {
  user: User | null;
  role: EUserRole | null;
  ability: ReturnType<typeof defineAbilityFor>;
  isAuthReady: boolean;
  signInWithEmail: (args: { email: string; password: string }) => Promise<void>;
  /** Exposed so tests (and app) can trigger a full hard-clear without auth calls */
  hardClear: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<EUserRole | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    // Use onIdTokenChanged so custom-claim updates are detected
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u ?? null);

      if (u) {
        try {
          const token = await u.getIdTokenResult(false);
          const claim = (token.claims.role as string | undefined) ?? null;

          let normalized: EUserRole | null = null;
          if (claim === 'admin' || claim === EUserRole.ADMIN)
            normalized = EUserRole.ADMIN;
          else if (claim === 'editor' || claim === EUserRole.EDITOR)
            normalized = EUserRole.EDITOR;
          else if (claim === 'viewer' || claim === EUserRole.VIEWER)
            normalized = EUserRole.VIEWER;

          setRole(normalized);
        } catch {
          setRole(null);
        }
      } else {
        setRole(null);
      }

      setIsAuthReady(true);
    });

    return unsub;
  }, []);

  const ability = useMemo(() => defineAbilityFor({ user, role }), [user, role]);

  const signInWithEmail: AuthContextType['signInWithEmail'] = async ({
    email,
    password,
  }) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    // Force-refresh to immediately pick up any updated custom claims
    await auth.currentUser?.getIdToken(true);
  };

  /** Centralized full reset (used by logout and tests) */
  const hardClear: AuthContextType['hardClear'] = useCallback(async () => {
    try {
      // 1) reset all zustand stores via registry (cart, etc.)
      runAllStoreResets();
    } catch {
      // ignore
    }
    try {
      // 2) clear react-query caches
      queryClient.clear();
    } catch {
      // ignore
    }
    // 3) wipe storages (persisted auth/cart/etc.)
    try {
      indexedDB.deleteDatabase('firebaseLocalStorageDb');
    } catch {
      // ignore
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  }, [queryClient]);

  // ✅ Bullet-proof logout: Firebase signOut + HARD CLEAR + redirect.
  const logout: AuthContextType['logout'] = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore signOut failures — we still hard-clear locally
    } finally {
      setUser(null);
      setRole(null);
      setIsAuthReady(true);
      await hardClear();
      // Hard redirect to ensure no stale UI state remains
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
  }, [hardClear]);

  // Optional E2E bypass
  if (typeof window !== 'undefined' && (window as any).__E2E_ALLOW__ === true) {
    const e2eAbility = defineAbilityFor({
      user: (user ?? ({} as any)) as User,
      role: (role ?? EUserRole.ADMIN) as EUserRole,
    });
    return (
      <AuthContext.Provider
        value={{
          user,
          role: (role ?? EUserRole.ADMIN) as EUserRole,
          ability: e2eAbility,
          isAuthReady: true,
          signInWithEmail,
          hardClear,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        ability,
        isAuthReady,
        signInWithEmail,
        hardClear,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
