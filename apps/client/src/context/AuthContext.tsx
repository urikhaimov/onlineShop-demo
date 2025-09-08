'use client';

import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import gravatar from 'gravatar';
import {
  type User,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  getIdTokenResult,
} from 'firebase/auth';
import {
  type AbilityTuple,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from '@casl/ability';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { EUserRole } from '@common/types';
import { defineAbilityFor } from '../services/ability.service';
import { logger } from '@common/utils';
import { ERoutePaths } from '../config/routesConfig';
import { auth } from '../firebase';
import axiosInstance from '../api/axiosInstance';
import type {
  LoginFormData,
  RegisterFormData,
} from '../services/schemas/auth.schema';

// 🔧 Zustand reset registry + cart store registration
import { registerStoreReset, runAllStoreResets } from '../state/resetRegistry';
import { useCartStore } from '../stores/useCartStore';

// Register this store's reset once at module load
registerStoreReset(() => useCartStore.getState().reset());

export type TUserRole = EUserRole.ADMIN | EUserRole.EDITOR | EUserRole.VIEWER;

export const isAdmin = (role: TUserRole) => role === EUserRole.ADMIN;
export const isEditor = (role: TUserRole) => role === EUserRole.EDITOR;
export const isViewer = (role: TUserRole) => role === EUserRole.VIEWER;

export interface AuthContextType {
  user: User | null;
  loading: boolean; // true until first onAuthStateChanged fires
  role: TUserRole | null;
  ability: MongoAbility<AbilityTuple, MongoQuery>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (data: LoginFormData) => Promise<void>;
  registerWithEmail: (data: RegisterFormData) => Promise<void>;
  signOut: () => Promise<void>;
  accessToken?: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

async function readRoleFromClaims(
  u: User | null,
  forceRefresh = false,
): Promise<TUserRole | null> {
  if (!u) return null;
  try {
    const res = await getIdTokenResult(u, forceRefresh);
    const raw = res.claims?.role as string | undefined;
    if (!raw) return null;
    if (Object.values(EUserRole).includes(raw as EUserRole)) {
      return raw as TUserRole;
    }
    return null;
  } catch (err) {
    logger.error('readRoleFromClaims error', err);
    return null;
  }
}

async function ensureRoleClaim(u: User): Promise<TUserRole | null> {
  try {
    await axiosInstance.post(
      '/auth/set-role',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await u.getIdToken()}`,
        },
      },
    );
    return await readRoleFromClaims(u, true);
  } catch (err) {
    logger.error('ensureRoleClaim failed', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<TUserRole | null>(null);
  const [loading, setLoading] = useState(true); // 🔑 becomes false after first auth resolve
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  const ability = useMemo(
    () =>
      createMongoAbility<AbilityTuple>([]) as MongoAbility<
        AbilityTuple,
        MongoQuery
      >,
    [],
  );

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const firstResolved = useRef(false);

  // Keep ability in sync with user/role
  useEffect(() => {
    ability.update(defineAbilityFor({ user, role }).rules);
    return () => {
      ability.update(defineAbilityFor({ user: null, role: null }).rules);
    };
  }, [ability, user, role]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);

        if (u) {
          // Access token (optional)
          try {
            const t = await u.getIdToken(false);
            setAccessToken(t);
          } catch {
            setAccessToken(undefined);
          }

          // Try to read role from claims; if missing, request backend to set it
          let r = await readRoleFromClaims(u, true);
          if (!r) r = await ensureRoleClaim(u);

          if (!r) {
            logger.warn('No role found for user, clearing session');
            await hardClear(); // ensure all caches are consistent
            navigate(ERoutePaths.LOGIN);
            return;
          }
          setRole(r);
        } else {
          await hardClear();
        }
      } finally {
        if (!firstResolved.current) {
          firstResolved.current = true;
          setLoading(false);
        }
      }
    });

    return () => unsub();
  }, []);

  // Centralized cleanup for logout / invalid session
  const hardClear = async () => {
    try {
      // React Query
      queryClient.clear();
    } catch {
      // ignore
    }

    try {
      // All registered Zustand store resets
      runAllStoreResets();
    } catch {
      // ignore
    }

    // Remove any persisted keys you use (zustand persist, auth, carts, etc.)
    const localKeys = [
      'cart',
      'profile',
      'auth',
      'zustand',
      'zustandPersist:cart',
    ];
    for (const key of localKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    // Your cart store uses sessionStorage key "cart-storage"
    try {
      sessionStorage.removeItem('cart-storage');
    } catch {
      // ignore
    }

    setUser(null);
    setRole(null);
    setAccessToken(undefined);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate(ERoutePaths.HOME);
    } catch (error) {
      logger.error('Error during Google sign in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      navigate(ERoutePaths.HOME);
    } catch (error) {
      logger.error('Error signing in with email:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );

      const photoURL = gravatar.url(data.email);
      const displayName = `${data.firstName} ${data.lastName}`;
      await updateProfile(cred.user, { displayName, photoURL });
      await cred.user.reload(); // onAuthStateChanged will reflect changes

      navigate(ERoutePaths.HOME);
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      logger.error('Error during sign out:', error);
    } finally {
      await hardClear();
      navigate(ERoutePaths.LOGIN);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    role,
    ability,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
    accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
