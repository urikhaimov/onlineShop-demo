'use client';

import React, { createContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { EUserRole } from '@common/types';
import { defineAbilityFor } from '../services/ability.service';

/** Simple role helper exported for consumers (e.g., ability.service) */
export const isAdmin = (role: EUserRole | string | null | undefined): boolean =>
  role === EUserRole.ADMIN || role === 'admin' || role === 'ADMIN';

export type AuthContextType = {
  user: User | null;
  role: EUserRole | null;
  ability: ReturnType<typeof defineAbilityFor>;
  isAuthReady: boolean; // ✅ NEW
  // ...keep whatever actions you already expose (signIn, signOut, etc.)
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<EUserRole | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // ✅ NEW

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      // TODO: setRole(...) if you derive role from claims/Firestore
      setIsAuthReady(true); // ✅ fire once we have the initial auth state
    });
    return unsub;
  }, []);

  const ability = useMemo(() => defineAbilityFor({ user, role }), [user, role]);

  // Optional: enable very fast E2E bypass without waiting for Firebase
  if (typeof window !== 'undefined' && (window as any).__E2E_ALLOW__ === true) {
    return (
      <AuthContext.Provider
        value={{
          user,
          role,
          ability: defineAbilityFor({
            user: user ?? ({} as any),
            role: role ?? (EUserRole.ADMIN as any),
          }),
          isAuthReady: true,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role, ability, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}
