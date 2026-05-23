'use client';

import React, {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type PropsWithChildren,
} from 'react';
import type { User } from 'firebase/auth';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  getIdTokenResult, // ✅ use function mocked by tests
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import axiosInstance from '../api/axiosInstance';
import { retryWithBackoff } from '../utils/retryWithBackoff';
import { EUserRole } from '@common/types';
import { defineAbilityFor } from '../services/ability.service';
import { runAllStoreResets } from '../state/resetRegistry';
import { useQueryClient } from '@tanstack/react-query';

/** Simple role helper exported for consumers (e.g., ability.service) */
export const isAdmin = (role: EUserRole | string | null | undefined): boolean =>
  role === 'admin' || role === EUserRole.ADMIN || role === 'ADMIN';

type RoleString = 'viewer' | 'editor' | 'admin' | 'superadmin' | null;

export type AuthContextType = {
  user: User | null;
  role: RoleString | EUserRole | null; // ✅ expose lowercase string too
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
  const [role, setRole] = useState<RoleString>(null); // ✅ lowercase role
  const [isAuthReady, setIsAuthReady] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // guards
  const attemptedEnsureRef = useRef(false);
  const didKickRef = useRef(false);

  const normalizeRole = (raw: any): RoleString => {
    const lower = typeof raw === 'string' ? raw.toLowerCase() : null;
    if (
      lower === 'viewer' ||
      lower === 'editor' ||
      lower === 'admin' ||
      lower === 'superadmin'
    )
      return lower;
    return null;
  };

  const readRoleFromClaims = useCallback(
    async (u: User | null, force = false): Promise<RoleString> => {
      if (!u) {
        setRole(null);
        return null;
      }
      try {
        const res = await getIdTokenResult(u, force);
        const next = normalizeRole((res.claims as any)?.role);
        setRole(next);
        return next;
      } catch {
        setRole(null);
        return null;
      }
    },
    [],
  );

  /** Centralized full reset (used by logout and tests) */
  const hardClear: AuthContextType['hardClear'] = useCallback(async () => {
    try {
      runAllStoreResets();
    } catch {
      // ignore
    }
    try {
      queryClient.clear();
    } catch {
      // ignore
    }
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

  const hardClearAndKick = useCallback(async () => {
    if (didKickRef.current) return; // ✅ only once
    didKickRef.current = true;
    await hardClear();
    navigate('/login', { replace: true });
  }, [hardClear, navigate]);

  // Ensure custom role claim exists if missing (run once)
  const ensureRoleIfMissing = useCallback(
    async (u: User) => {
      if (attemptedEnsureRef.current) return; // ✅ run once per session
      attemptedEnsureRef.current = true;

      await retryWithBackoff(() => axiosInstance.post('/auth/ensure-role'));
      // force refresh, then re-read claims
      await auth.currentUser?.getIdToken?.(true);
      const next = await readRoleFromClaims(u, true);
      if (!next) {
        await hardClearAndKick();
      }
    },
    [readRoleFromClaims, hardClearAndKick],
  );

  // Listener: detects user + claim updates
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u ?? null);
      await readRoleFromClaims(u ?? null, false);
      setIsAuthReady(true);
    });
    return unsub;
  }, [readRoleFromClaims]);

  // Bootstrap flow: if signed-in but role is missing, try to ensure it
  useEffect(() => {
    if (user && role === null) {
      void ensureRoleIfMissing(user);
    }
  }, [user, role, ensureRoleIfMissing]);

  const ability = useMemo(() => defineAbilityFor({ user, role }), [user, role]);

  const signInWithEmail: AuthContextType['signInWithEmail'] = async ({
    email,
    password,
  }) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    await auth.currentUser?.getIdToken?.(true);
  };

  const logout: AuthContextType['logout'] = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    } finally {
      setUser(null);
      setRole(null);
      setIsAuthReady(true);
      await hardClear();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    }
  }, [hardClear]);

  // Optional E2E bypass
  if (typeof window !== 'undefined' && (window as any).__E2E_ALLOW__ === true) {
    const e2eAbility = defineAbilityFor({
      user: (user ?? ({} as any)) as User,
      role: (role ?? 'admin') as any,
    });
    return (
      <AuthContext.Provider
        value={{
          user,
          role: (role ?? 'admin') as any,
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
