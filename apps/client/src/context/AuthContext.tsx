'use client';

import React, { createContext, useEffect, useState } from 'react';
import gravatar from 'gravatar';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { jwtDecode } from 'jwt-decode';
import {
  LoginFormData,
  RegisterFormData,
} from '../services/schemas/auth.schema';
import { useNavigate } from 'react-router';
import {
  type AbilityTuple,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from '@casl/ability';
import { EUserRole } from '@common/types';
import { defineAbilityFor } from '../services/ability.service';
import { logger } from '@common/utils';
import { ERoutePaths } from '../config/routesConfig';
import { auth } from '../firebase';
import axiosInstance from '../api/axiosInstance';

export type TUserRole = EUserRole.ADMIN | EUserRole.EDITOR | EUserRole.VIEWER;

export const isAdmin = (role: TUserRole): boolean => {
  return role === EUserRole.ADMIN;
};

export const isEditor = (role: TUserRole): boolean => {
  return role === EUserRole.EDITOR;
};

export const isViewer = (role: TUserRole): boolean => {
  return role === EUserRole.VIEWER;
};

const CUserRoleKey = 'userRole';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: TUserRole | null;
  ability: MongoAbility<AbilityTuple, MongoQuery>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (data: LoginFormData) => Promise<void>;
  registerWithEmail: (data: RegisterFormData) => Promise<void>;
  signOut: () => Promise<void>;
  accessToken?: string;
}

type FirebaseClaims = {
  role?: string;
  [key: string]: any;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const getUserClaims = async (): Promise<FirebaseClaims | null> => {
  const user = auth.currentUser;

  if (!user) {
    logger.warn('No user signed in');
    return null;
  }

  try {
    const idToken = await user.getIdToken(true); // force refresh
    return jwtDecode<FirebaseClaims>(idToken);
  } catch (error) {
    logger.error('Failed to get claims', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<TUserRole | null>(null);
  const [ability, setAbility] = useState<
    MongoAbility<AbilityTuple, MongoQuery>
  >(
    createMongoAbility<AbilityTuple>([]) as MongoAbility<
      AbilityTuple,
      MongoQuery
    >,
  );

  // const { setAuthRoles } = boardApi.endpoints;
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User) => {
      if (user) {
        setUser(user);

        const claims = await getUserClaims();

        if (claims?.role) {
          setRoleState(claims.role as TUserRole);
        } else {
          await axiosInstance.post(
            '/auth/set-role',
            {},
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await user.getIdToken()}`,
              },
            },
          );

          await auth.currentUser.getIdToken(true);

          const claims = await getUserClaims();

          if (claims?.role) {
            setRoleState(claims.role as TUserRole);
          } else {
            logger.warn('No role found for user, clearing session');
            clearUser();
          }
        }

        resetAbility(user);
      } else {
        clearUser();
      }
      setLoading(false);
    });

    // store.dispatch(setAuthRoles.initiate())

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (role) {
      setAbility(defineAbilityFor({ user, role }));
    }

    return () => resetAbility(user);
  }, [user, role]);

  const resetAbility = (user: User | null) => {
    setAbility(defineAbilityFor({ user, role: null }));
  };

  const clearUser = () => {
    setUser(null);
    setRoleState(null);
    resetAbility(null);
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password,
      );
      const photoURL = gravatar.url(data?.email);
      const displayName = `${data.firstName} ${data.lastName}`;

      await updateProfile(userCredential.user, {
        displayName,
        photoURL,
      });

      // Refetch user to get updated profile
      setUser({
        ...userCredential.user,
        displayName,
        photoURL,
      });

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
      clearUser();
      navigate(ERoutePaths.LOGIN);
    } catch (error) {
      logger.error('Error during sign out:', error);
    }
  };

  const value = {
    user,
    loading,
    role,
    ability,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
