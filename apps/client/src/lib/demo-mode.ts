/**
 * DEMO ADMIN MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Lets portfolio visitors explore the full admin panel without a real account.
 * Activated by VITE_DEMO_ADMIN=true (set in Vercel env vars for the demo site).
 */
export const isDemoAdmin = (): boolean => {
  return import.meta.env.VITE_DEMO_ADMIN === 'true';
};

/**
 * Synthetic user presented to the rest of the app in demo mode.
 * Cast to `User` at call sites — only the fields that the app actually reads
 * need to be present (uid, email, displayName, emailVerified, photoURL).
 */
export const DEMO_ADMIN_USER = {
  uid: 'demo-admin',
  email: 'demo@bundershop.app',
  displayName: 'Demo Admin',
  emailVerified: true,
  photoURL: null,
} as const;
