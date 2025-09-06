// csp.ts
// Dev-friendly CSP for Vite + Firebase Auth + Stripe.
// If you also send a META CSP, prefer using this header version only to avoid conflicts.
export const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",

  // Scripts: Stripe + Google Identity/Firebase
  // ('unsafe-eval' is convenient in dev; remove in prod if desired)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://apis.google.com https://www.gstatic.com",
  "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://apis.google.com https://www.gstatic.com",

  // Styles & fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",

  // Images: app assets + uploads + Google avatars + Stripe beacons
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleusercontent.com https://www.gstatic.com https://q.stripe.com",

  // XHR/fetch/WebSocket endpoints (backend + Firebase/Google APIs + Vite dev)
  "connect-src 'self' http://localhost:3000 http://localhost:5173 ws://localhost:5173 ws: wss: https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebase.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://www.googleapis.com https://apis.google.com https://accounts.google.com https://*.googleapis.com https://*.gstatic.com",

  // OAuth / checkout popups/iframes — include Firebase Hosting auth handler/iframe
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://onlinestoretemplate-59d3e.firebaseapp.com https://onlinestoretemplate-59d3e.web.app https://*.firebaseapp.com https://*.web.app",

  // Workers
  "worker-src 'self' blob:",

  // Prevent embedding by other sites (effective when sent as a header; ignored in <meta>)
  "frame-ancestors 'self'",
].join('; ');
