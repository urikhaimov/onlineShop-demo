// libs/firebase-admin.ts
import * as admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';

// ---- Test-friendly + robust initialization ----
const isTest =
  process.env['NODE_ENV'] === 'test' || !!process.env['JEST_WORKER_ID'];

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Strip surrounding quotes that some platforms add
  let key = raw.replace(/^["']|["']$/g, '');
  // Replace literal \n (two chars) with real newlines
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  return key;
}

function resolveCredential() {
  // Prefer a full service-account JSON blob — avoids all newline-escaping issues
  const jsonBlob = process.env['FB_ADMIN_SERVICE_ACCOUNT_JSON'];
  if (jsonBlob) {
    try {
      return JSON.parse(jsonBlob);
    } catch {
      throw new Error('FB_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  const projectId = process.env['FB_ADMIN_PROJECT_ID'];
  const clientEmail = process.env['FB_ADMIN_CLIENT_EMAIL'];
  const privateKey = parsePrivateKey(process.env['FB_ADMIN_PRIVATE_KEY']);
  if (!projectId || !clientEmail || !privateKey) return null;

  return {
    projectId,
    privateKeyId: process.env['FB_ADMIN_PRIVATE_KEY_ID'],
    privateKey,
    clientEmail,
    clientId: process.env['FB_ADMIN_CLIENT_ID'],
    authUri: process.env['FB_ADMIN_AUTH_URI'],
    tokenUri: process.env['FB_ADMIN_TOKEN_URI'],
    authProviderX509CertUrl:
      process.env['FB_ADMIN_AUTH_PROVIDER_X509_CERT_URL'],
    clientX509CertUrl: process.env['FB_ADMIN_CLIENT_X509_CERT_URL'],
  };
}

const projectId = process.env['FB_ADMIN_PROJECT_ID'];

if (!admin.apps.length) {
  if (isTest) {
    admin.initializeApp({ projectId: projectId || 'demo-test' });
  } else {
    const credential = resolveCredential();
    if (credential) {
      admin.initializeApp({ credential: cert(credential as any), projectId });
    } else {
      // Fallback: ADC (GOOGLE_APPLICATION_CREDENTIALS) or throws on first use
      admin.initializeApp();
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
