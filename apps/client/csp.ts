export const csp = [
  "default-src 'self'",

  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://apis.google.com",

  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  "font-src 'self' https://fonts.gstatic.com https://js.stripe.com",

  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com",

  "connect-src 'self' http://localhost:3000 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebase.googleapis.com https://storage.googleapis.com https://firebasestorage.googleapis.com https://www.googleapis.com",

  'frame-src https://js.stripe.com https://hooks.stripe.com',

  "worker-src 'self' blob:",
].join('; ');
