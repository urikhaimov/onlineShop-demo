// libs/firebase-admin.ts
import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

// ---- Test-friendly + robust initialization ----
const isTest =
  process.env['NODE_ENV'] === 'test' || !!process.env['JEST_WORKER_ID'];

const projectId = process.env['FB_ADMIN_PROJECT_ID'];
const clientEmail = process.env['FB_ADMIN_CLIENT_EMAIL'];
// Handle escaped newlines coming from env files/CI
const rawPk = process.env['FB_ADMIN_PRIVATE_KEY'];
const privateKey =
  rawPk && rawPk.includes('\\n') ? rawPk.replace(/\\n/g, '\n') : rawPk;

const hasServiceAccount = !!projectId && !!clientEmail && !!privateKey;

if (!admin.apps.length) {
  if (isTest) {
    // ✅ In tests, avoid real credentials. Use a dummy project id.
    admin.initializeApp({
      projectId: projectId || 'demo-test',
    });
  } else if (hasServiceAccount) {
    admin.initializeApp({
      credential: cert({
        projectId,
        privateKeyId: process.env['FB_ADMIN_PRIVATE_KEY_ID'],
        privateKey,
        clientEmail,
        // The extra fields below are optional; kept for completeness.
        clientId: process.env['FB_ADMIN_CLIENT_ID'],
        authUri: process.env['FB_ADMIN_AUTH_URI'],
        tokenUri: process.env['FB_ADMIN_TOKEN_URI'],
        authProviderX509CertUrl:
          process.env['FB_ADMIN_AUTH_PROVIDER_X509_CERT_URL'],
        // Fix typo: clientX509CertUrl (not clientC509CertUrl)
        clientX509CertUrl: process.env['FB_ADMIN_CLIENT_X509_CERT_URL'],
        // ❌ no `type`
        // ❌ no `universe_domain`
      } as any),
      projectId,
    });
  } else {
    // Fallback: try ADC (e.g., GOOGLE_APPLICATION_CREDENTIALS) if present.
    // If not configured, admin SDK will throw on first access — which is fine for environments
    // that mock @common/firebase in tests.
    admin.initializeApp();
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
