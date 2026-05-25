/**
 * DEMO ADMIN MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Lets portfolio visitors explore the full admin panel without a real account.
 * Activated by VITE_DEMO_ADMIN=true in apps/client/.env (or .env.local).
 *
 * Three independent guards — ALL must pass to activate:
 *
 *   1. VITE_DEMO_ADMIN === 'true'  — explicit opt-in; never set in prod configs
 *   2. import.meta.env.PROD === false — Vite strips dead code in production builds,
 *      so even if someone sets the var by mistake, it will never reach guard 3
 *   3. hostname is localhost / 127.0.0.1 — prevents activation on deployed previews
 *      or staging servers that accidentally received the env var
 *
 * Together these make accidental production exposure essentially impossible.
 */
export const isDemoAdmin = (): boolean => {
  if (import.meta.env.PROD) return false;
  if (import.meta.env.VITE_DEMO_ADMIN !== 'true') return false;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return host === 'localhost' || host === '127.0.0.1';
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
