// libs/firebase-admin.ts
import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: cert({
      projectId: process.env['FB_ADMIN_PROJECT_ID'],
      privateKeyId: process.env['FB_ADMIN_PRIVATE_KEY_ID'],
      privateKey: process.env['FB_ADMIN_PRIVATE_KEY']?.replace(/\\n/g, '\n'),
      clientEmail: process.env['FB_ADMIN_CLIENT_EMAIL'],
      clientId: process.env['FB_ADMIN_CLIENT_ID'],
      authUri: process.env['FB_ADMIN_AUTH_URI'],
      tokenUri: process.env['FB_ADMIN_TOKEN_URI'],
      authProviderX509CertUrl:
        process.env['FB_ADMIN_AUTH_PROVIDER_X509_CERT_URL'],
      clientC509CertUrl: process.env['FB_ADMIN_CLIENT_X509_CERT_URL'],
      // ❌ no `type`
      // ❌ no `universe_domain`
    } as any), // cast if TS still complains
    projectId: process.env['FB_ADMIN_PROJECT_ID'],
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
