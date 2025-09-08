import type { QueryClient } from '@tanstack/react-query';

export type ResetFn = (() => void) | undefined;

/**
 * Clear app state on logout:
 * - React Query cache
 * - Any registered Zustand store resets
 * - Selected localStorage keys (safe try/catch)
 */
export function clearOnLogout(
  queryClient: Pick<QueryClient, 'clear'>,
  resets: ResetFn[] = [],
  options: { localKeys?: string[] } = {
    localKeys: ['cart', 'auth', 'profile'],
  },
) {
  try {
    queryClient.clear();
  } catch {
    // Ignore errors
  }

  for (const r of resets) {
    try {
      r?.();
    } catch {
      // Ignore errors
    }
  }

  for (const key of options.localKeys ?? []) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }
}
