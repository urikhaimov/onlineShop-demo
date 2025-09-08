// src/providers/AbilityProvider.tsx
import React from 'react';
import { AbilityContext } from '../context/AbilityContext';
import { defineAbilityFor } from '../services/ability.service';
import { useAuth } from '../context/AuthContext';

export function AbilityProvider({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();

  // Recompute ability whenever the auth user/role changes
  const ability = React.useMemo(
    () => defineAbilityFor({ user, role }),
    [user, role],
  );

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}

export default AbilityProvider;
