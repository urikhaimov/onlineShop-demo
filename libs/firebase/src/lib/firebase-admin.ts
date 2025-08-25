import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

admin.initializeApp({
  credential: cert({
    // @ts-expect-error - Provided by firebase.
    type: process.env['FB_ADMIN_TYPE'],
    project_id: process.env['FB_ADMIN_PROJECT_ID'],
    private_key_id: process.env['FB_ADMIN_PRIVATE_KEY_ID'],
    private_key: process.env['FB_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
    client_email: process.env['FB_ADMIN_CLIENT_EMAIL'],
    client_id: process.env['FB_ADMIN_CLIENT_ID'],
    auth_uri: process.env['FB_ADMIN_AUTH_URI'],
    token_uri: process.env['FB_ADMIN_TOKEN_URI'],
    auth_provider_x509_cert_url:
      process.env['FB_ADMIN_AUTH_PROVIDER_X509_CERT_URL'],
    client_x509_cert_url: process.env['FB_ADMIN_CLIENT_X509_CERT_URL'],
    universe_domain: process.env['FB_ADMIN_UNIVERSE_DOMAIN'],
  }),
});

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth, admin };
