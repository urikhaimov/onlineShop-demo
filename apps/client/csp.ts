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

// Domains that Google Sign-In and Firebase Auth need to LOAD scripts from
// (separate from connect/frame; CSP differentiates).
const GOOGLE_SCRIPTS = [
  'https://apis.google.com',
  'https://accounts.google.com',
  'https://www.gstatic.com',
];

// Google Sign-In renders its consent popup in an iframe from these origins.
const GOOGLE_FRAMES = [
  'https://accounts.google.com',
  'https://online-shop-75482.firebaseapp.com',
];

const PAYPAL = {
  script: ['https://www.paypal.com', 'https://www.paypalobjects.com'],
  connect: [
    'https://api-m.paypal.com',
    'https://api-m.sandbox.paypal.com',
    'https://*.paypal.com',
  ],
  frame: ['https://www.paypal.com', 'https://www.sandbox.paypal.com'],
};

export const csp = isDev
  ? [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // scheme-level in dev so emulators are always allowed
      "connect-src 'self' http: https: ws: wss: data: blob:",
      "img-src 'self' data: blob: http: https:",
      // allow PayPal + Google Sign-In scripts in dev
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PAYPAL.script.join(' ')} ${GOOGLE_SCRIPTS.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https://www.paypalobjects.com",
      // allow PayPal + Google Sign-In iframes in dev
      `frame-src ${GOOGLE_FRAMES.join(' ')} ${PAYPAL.frame.join(' ')}`,
      "worker-src 'self' blob:",
    ].join('; ')
  : [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      // add PayPal connect targets in prod
      `connect-src 'self' ${GCP.join(' ')} ${PAYPAL.connect.join(' ')}`,
      "img-src 'self' data: blob: https://*.gstatic.com https://*.googleapis.com",
      // allow loading PayPal + Google Sign-In scripts in prod
      `script-src 'self' ${PAYPAL.script.join(' ')} ${GOOGLE_SCRIPTS.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data: https://www.paypalobjects.com",
      // allow PayPal + Google Sign-In iframes in prod
      `frame-src ${GOOGLE_FRAMES.join(' ')} ${PAYPAL.frame.join(' ')}`,
      "worker-src 'self' blob:",
    ].join('; ');
