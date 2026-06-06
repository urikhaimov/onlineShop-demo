const DEMO_HOSTNAMES = ['online-shop-demo-bice.vercel.app'];

/**
 * DEMO ADMIN MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Activates on the public demo site (matched by hostname) or when
 * VITE_DEMO_ADMIN=true is baked in via Vercel env vars.
 */
export const isDemoAdmin = (): boolean => {
  if (import.meta.env.VITE_DEMO_ADMIN === 'false') return false;
  if (import.meta.env.VITE_DEMO_ADMIN === 'true') return true;
  if (typeof window === 'undefined') return false;
  return DEMO_HOSTNAMES.includes(window.location.hostname);
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
