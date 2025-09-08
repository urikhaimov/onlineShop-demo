// apps/client/csp.ts
const isDev =
  process.env.NODE_ENV !== 'production' &&
  String(process.env.VITE_PREVIEW || '').toLowerCase() !== '1';

const GCP = [
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://storage.googleapis.com',
  'https://apis.google.com',
  'https://www.googleapis.com',
  'https://accounts.google.com',
  'https://*.googleapis.com',
  'https://*.gstatic.com',
];

// Stripe endpoints we need
const STRIPE = {
  script: ['https://js.stripe.com'],
  connect: ['https://api.stripe.com', 'https://m.stripe.network'],
  frame: ['https://js.stripe.com', 'https://hooks.stripe.com'],
};

export const csp = isDev
  ? [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // scheme-level in dev so emulators are always allowed
      "connect-src 'self' http: https: ws: wss: data: blob:",
      "img-src 'self' data: blob: http: https:",
      // allow Stripe JS in dev
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${STRIPE.script.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // allow Stripe frames in dev
      `frame-src https://accounts.google.com ${STRIPE.frame.join(' ')}`,
      "worker-src 'self' blob:",
    ].join('; ')
  : [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // add Stripe connect targets in prod
      `connect-src 'self' ${GCP.join(' ')} ${STRIPE.connect.join(' ')}`,
      "img-src 'self' data: blob: https://*.gstatic.com https://*.googleapis.com",
      // allow loading Stripe JS in prod
      `script-src 'self' ${STRIPE.script.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      // allow Stripe frames in prod
      `frame-src https://accounts.google.com ${STRIPE.frame.join(' ')}`,
      "worker-src 'self' blob:",
    ].join('; ');
