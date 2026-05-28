#!/usr/bin/env node
/**
 * new-client.mjs — Onboard a new store client (Option A: per-deployment)
 *
 * Usage:
 *   node scripts/new-client.mjs
 *
 * What it does:
 *   1. Prompts for client details
 *   2. Generates env files for Railway (API) and Vercel (frontend)
 *   3. Creates a Vercel project via API and sets all env vars
 *   4. Prints Railway setup checklist
 *   5. Saves client config to clients/<slug>/
 */

import readline from 'readline/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(ROOT, 'clients');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function ask(question, defaultVal = '') {
  const suffix = defaultVal ? ` (${defaultVal})` : '';
  const answer = await rl.question(`  ${question}${suffix}: `);
  return answer.trim() || defaultVal;
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function banner(text) {
  const line = '─'.repeat(text.length + 4);
  console.log(`\n┌${line}┐\n│  ${text}  │\n└${line}┘`);
}

function step(n, text) {
  console.log(`\n\x1b[36m[${n}]\x1b[0m ${text}`);
}

function ok(text) { console.log(`  \x1b[32m✓\x1b[0m ${text}`); }
function info(text) { console.log(`  \x1b[33m→\x1b[0m ${text}`); }
function warn(text) { console.log(`  \x1b[31m!\x1b[0m ${text}`); }

// ─── Vercel API ───────────────────────────────────────────────────────────────
async function vercelRequest(method, path, body, token) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || JSON.stringify(data));
  return data;
}

async function createVercelProject(token, projectName, gitRepo, envVars) {
  // Create project linked to GitHub repo
  const project = await vercelRequest('POST', '/v9/projects', {
    name: projectName,
    gitRepository: {
      type: 'github',
      repo: gitRepo, // e.g. "urikhaimov/onlineShop-demo"
    },
    framework: 'vite',
    rootDirectory: 'apps/client',
    buildCommand: 'npx nx build client --configuration=production',
    outputDirectory: 'dist/apps/client',
  }, token);

  ok(`Vercel project created: ${project.name} (id: ${project.id})`);

  // Add all env vars
  const envPayload = Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    type: 'encrypted',
    target: ['production', 'preview'],
  }));

  await vercelRequest('POST', `/v9/projects/${project.id}/env`, envPayload, token);
  ok(`${envPayload.length} environment variables added`);

  return project;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  banner('New Client Onboarding');
  console.log('  This script sets up a new store deployment for a client.\n');

  // ── 1. Client info ──────────────────────────────────────────────────────────
  step(1, 'Client Information');
  const storeName   = await ask('Store name', 'My Online Store');
  const clientSlug  = await ask('Client slug (URL-safe)', slug(storeName));
  const adminEmail  = await ask('Admin email (client\'s login)');
  const domain      = await ask('Custom domain (optional, press Enter to skip)');

  // ── 2. Firebase ─────────────────────────────────────────────────────────────
  step(2, 'Firebase Configuration');
  console.log('  ℹ  Create a new Firebase project at console.firebase.google.com');
  console.log('     Then paste the values from Project Settings → Your apps → Config\n');
  const firebaseApiKey    = await ask('VITE_FIREBASE_API_KEY');
  const firebaseAuthDomain = await ask('VITE_FIREBASE_AUTH_DOMAIN');
  const firebaseProjectId = await ask('VITE_FIREBASE_PROJECT_ID');
  const firebaseBucket    = await ask('VITE_FIREBASE_STORAGE_BUCKET');
  const firebaseSenderId  = await ask('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const firebaseAppId     = await ask('VITE_FIREBASE_APP_ID');

  console.log('\n  ℹ  Now generate a Firebase Admin service account:');
  console.log('     Firebase Console → Project Settings → Service accounts → Generate new private key\n');
  const fbAdminProjectId   = firebaseProjectId;
  const fbAdminClientEmail = await ask('FB_ADMIN_CLIENT_EMAIL');
  const fbAdminPrivateKey  = await ask('FB_ADMIN_PRIVATE_KEY (paste full key, \\n for newlines)');

  // ── 3. PayPal ────────────────────────────────────────────────────────────────
  step(3, 'PayPal Configuration');
  console.log('  ℹ  Client should create a PayPal developer account and create an app\n');
  const paypalEnv       = await ask('Sandbox or Live?', 'sandbox');
  const paypalClientId  = await ask('PAYPAL_CLIENT_ID');
  const paypalSecret    = await ask('PAYPAL_CLIENT_SECRET');
  const paypalSandbox   = paypalEnv.toLowerCase() === 'sandbox' ? 'true' : 'false';

  // ── 4. Email ─────────────────────────────────────────────────────────────────
  step(4, 'Email (SendGrid)');
  console.log('  ℹ  Client should create a free SendGrid account for their emails\n');
  const sendgridKey   = await ask('SENDGRID_API_KEY (or press Enter to skip)');
  const emailFrom     = await ask('EMAIL_FROM', adminEmail);

  // ── 5. API URL ───────────────────────────────────────────────────────────────
  step(5, 'Railway API URL');
  console.log('  ℹ  You will get this URL after creating the Railway service\n');
  const apiUrl = await ask('VITE_API_BASE (e.g. https://client-api.up.railway.app/api)', '');

  // ── 6. Vercel token ──────────────────────────────────────────────────────────
  step(6, 'Vercel Deployment');
  const vercelToken = await ask('Vercel personal access token (vercel.com/account/tokens)', '');
  const gitRepo     = await ask('GitHub repo (owner/repo)', 'urikhaimov/onlineShop-demo');

  // ── Build env vars ───────────────────────────────────────────────────────────
  const frontendEnv = {
    VITE_FIREBASE_API_KEY: firebaseApiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebaseAuthDomain,
    VITE_FIREBASE_PROJECT_ID: firebaseProjectId,
    VITE_FIREBASE_STORAGE_BUCKET: firebaseBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseSenderId,
    VITE_FIREBASE_APP_ID: firebaseAppId,
    VITE_API_BASE: apiUrl || `https://${clientSlug}-api.up.railway.app/api`,
    VITE_PAYPAL_CLIENT_ID: paypalClientId,
    VITE_DEMO_ADMIN: 'false',
  };

  const backendEnv = {
    NODE_ENV: 'production',
    FB_ADMIN_PROJECT_ID: fbAdminProjectId,
    FB_ADMIN_CLIENT_EMAIL: fbAdminClientEmail,
    FB_ADMIN_PRIVATE_KEY: fbAdminPrivateKey,
    FIREBASE_STORAGE_BUCKET: firebaseBucket,
    GCLOUD_PROJECT: fbAdminProjectId,
    GOOGLE_CLOUD_PROJECT: fbAdminProjectId,
    PAYPAL_CLIENT_ID: paypalClientId,
    PAYPAL_CLIENT_SECRET: paypalSecret,
    PAYPAL_SANDBOX: paypalSandbox,
    ADMINS_LIST: adminEmail,
    ...(sendgridKey ? { SENDGRID_API_KEY: sendgridKey, EMAIL_PROVIDER: 'sendgrid' } : {}),
    EMAIL_FROM: emailFrom,
    SEND_PAYPAL_EMAILS_FROM_ORDERS: 'true',
    FRONTEND_ORIGIN: domain
      ? `https://${domain}`
      : `https://${clientSlug}.vercel.app`,
    ALLOWED_ORIGINS: domain
      ? `https://${domain},https://${clientSlug}.vercel.app`
      : `https://${clientSlug}.vercel.app`,
  };

  // ── Save client config ───────────────────────────────────────────────────────
  const clientDir = path.join(CLIENTS_DIR, clientSlug);
  fs.mkdirSync(clientDir, { recursive: true });

  fs.writeFileSync(
    path.join(clientDir, '.env.frontend'),
    Object.entries(frontendEnv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
  );

  fs.writeFileSync(
    path.join(clientDir, '.env.backend'),
    Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n') + '\n',
  );

  const config = {
    slug: clientSlug,
    storeName,
    adminEmail,
    domain: domain || null,
    firebaseProjectId,
    paypalSandbox: paypalEnv.toLowerCase() === 'sandbox',
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(clientDir, 'config.json'), JSON.stringify(config, null, 2));

  ok(`Client files saved to clients/${clientSlug}/`);

  // ── Vercel deployment ────────────────────────────────────────────────────────
  banner('Deploying to Vercel');
  if (vercelToken) {
    try {
      const projectName = `${clientSlug}-shop`;
      const project = await createVercelProject(vercelToken, projectName, gitRepo, frontendEnv);
      ok(`Vercel URL: https://${project.name}.vercel.app`);
      if (domain) info(`Add domain ${domain} in Vercel → Project → Domains`);
    } catch (e) {
      warn(`Vercel setup failed: ${e.message}`);
      info('Set up Vercel manually — env file saved at clients/${clientSlug}/.env.frontend');
    }
  } else {
    info('No Vercel token — set up manually:');
    info('1. vercel.com → Add New Project → Import Git Repository');
    info(`2. Project name: ${clientSlug}-shop`);
    info('3. Copy env vars from: clients/' + clientSlug + '/.env.frontend');
  }

  // ── Railway instructions ─────────────────────────────────────────────────────
  banner('Railway Setup (manual)');
  console.log(`
  1. Go to railway.app → New Project → Deploy from GitHub repo
  2. Select: ${gitRepo}
  3. Service name: ${clientSlug}-api
  4. Build command: npx nx build api --configuration=production
  5. Start command: node dist/apps/api/main.js
  6. Add env vars from: clients/${clientSlug}/.env.backend
  7. After deploy, copy the Railway URL and update:
     - VITE_API_BASE in Vercel to: https://<railway-url>/api
     - FRONTEND_ORIGIN in Railway to match your Vercel URL
  `);

  // ── Firebase setup ───────────────────────────────────────────────────────────
  banner('Firebase Setup (manual)');
  console.log(`
  1. Go to console.firebase.google.com → Project: ${firebaseProjectId}
  2. Authentication → Sign-in method → Enable Google + Email/Password
  3. Authentication → Settings → Authorized domains → Add:
     - ${clientSlug}-shop.vercel.app
     ${domain ? `- ${domain}` : ''}
  4. Firestore → Create database (production mode)
  5. Deploy security rules:
     firebase use ${firebaseProjectId}
     firebase deploy --only firestore:rules
  6. Create admin user:
     node scripts/set-admin.js ${adminEmail}
  `);

  // ── Summary ──────────────────────────────────────────────────────────────────
  banner('Summary');
  console.log(`
  Client:    ${storeName} (${clientSlug})
  Admin:     ${adminEmail}
  Firebase:  ${firebaseProjectId}
  PayPal:    ${paypalEnv} mode
  Email:     ${sendgridKey ? 'SendGrid configured' : 'Not configured (add SENDGRID_API_KEY later)'}

  Files saved:
  ├── clients/${clientSlug}/config.json
  ├── clients/${clientSlug}/.env.frontend  → paste into Vercel
  └── clients/${clientSlug}/.env.backend   → paste into Railway

  Next: Run the setup wizard at /admin/setup after deployment.
  Estimated time to live: 20–30 minutes.
  `);

  rl.close();
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message);
  rl.close();
  process.exit(1);
});
