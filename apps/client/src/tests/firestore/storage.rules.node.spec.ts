import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { ref as sref, uploadBytes, getBytes } from 'firebase/storage';

// ── repo root ──────────────────────────────────────────────────────────────────
const __dirnameFile = path.dirname(url.fileURLToPath(import.meta.url));
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'firebase.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('Could not locate repo root (firebase.json not found)');
}
const REPO_ROOT = findRepoRoot(__dirnameFile);

// ── config & rules ─────────────────────────────────────────────────────────────
const PROJECT_ID = process.env.PROJECT_ID || 'onlinestoretemplate-59d3e';
const FIREBASE_JSON_PATH = path.join(REPO_ROOT, 'firebase.json');
const STORAGE_RULES_PATH = path.join(REPO_ROOT, 'storage.rules');
const STORAGE_RULES = fs.readFileSync(STORAGE_RULES_PATH, 'utf8');

function parseHostPort(raw?: string, defHost = '127.0.0.1', defPort = 9199) {
  if (!raw) return { host: defHost, port: defPort };
  const stripped = raw.replace(/^https?:\/\//i, '');
  const [hostPart, portPart] = stripped.split(':');
  const host = hostPart || defHost;
  const port = Number(portPart) || defPort;
  return { host, port };
}
function resolveStorageEmu() {
  // common env vars set by emulators:exec or manually
  const env =
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||
    process.env.STORAGE_EMULATOR_HOST;
  if (env) return parseHostPort(env, '127.0.0.1', 9199);
  // fallback to firebase.json
  try {
    const fb = JSON.parse(fs.readFileSync(FIREBASE_JSON_PATH, 'utf8'));
    const host = fb?.emulators?.storage?.host ?? '127.0.0.1';
    const port = fb?.emulators?.storage?.port ?? 9199;
    return { host, port };
  } catch {
    return { host: '127.0.0.1', port: 9199 };
  }
}

let testEnv: RulesTestEnvironment;

function authedStorage(uid: string, claims?: Record<string, any>) {
  return testEnv.authenticatedContext(uid, claims).storage();
}
function unauthStorage() {
  return testEnv.unauthenticatedContext().storage();
}

beforeAll(async () => {
  const { host, port } = resolveStorageEmu();
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { host, port, rules: STORAGE_RULES },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('Storage security rules', () => {
  it('product images: public read, only admin/superadmin write & <10MB & image/*', async () => {
    const objectPath = `products/p_${Date.now()}/image.png`; // match /products/{productId}/{file=**}
    const png = new Uint8Array([137, 80, 78, 71]);

    const stAdmin = authedStorage('adm', { role: 'admin' });
    await uploadBytes(sref(stAdmin, objectPath), png, {
      contentType: 'image/png',
    });

    const stAnon = unauthStorage();
    const buf = await getBytes(sref(stAnon, objectPath));
    expect(buf.byteLength).toBeGreaterThan(0);

    const stUser = authedStorage('u1', { role: 'user' });
    await expect(
      uploadBytes(sref(stUser, `products/deny_${Date.now()}/image.png`), png, {
        contentType: 'image/png',
      }),
    ).rejects.toThrow(/permission/i);
  });

  it('avatars: only owner can write; public read; must be image/* and <10MB', async () => {
    const uid = `u_${Date.now()}`;
    const okPath = `avatars/${uid}/avatar.png`;
    const png = new Uint8Array([137, 80, 78, 71]);

    const stOwner = authedStorage(uid, { role: 'user' });
    await uploadBytes(sref(stOwner, okPath), png, { contentType: 'image/png' });

    const stAnon = unauthStorage();
    const buf = await getBytes(sref(stAnon, okPath));
    expect(buf.byteLength).toBeGreaterThan(0);

    const stOther = authedStorage('other', { role: 'user' });
    await expect(
      uploadBytes(sref(stOther, `avatars/${uid}/intruder.png`), png, {
        contentType: 'image/png',
      }),
    ).rejects.toThrow(/permission/i);
  });

  it('temp: owner can read/write their own; limit 20MB', async () => {
    const uid = `u_${Date.now()}`;
    const st = authedStorage(uid, { role: 'user' });

    const small = new Uint8Array(1024);
    await uploadBytes(sref(st, `temp/${uid}/file.bin`), small);

    const got = await getBytes(sref(st, `temp/${uid}/file.bin`));
    expect(got.byteLength).toBe(1024);
  });

  // Negative cases for stricter coverage
  it('product images: non-image content type is rejected', async () => {
    const objectPath = `products/p_${Date.now()}/not-image.bin`;
    const bytes = new Uint8Array([0, 1, 2, 3]);

    const stAdmin = authedStorage('adm', { role: 'admin' });
    await expect(
      uploadBytes(sref(stAdmin, objectPath), bytes, {
        contentType: 'text/plain',
      }),
    ).rejects.toThrow(/permission/i);
  });

  it('product images: >10MB payload is rejected', async () => {
    const objectPath = `products/p_${Date.now()}/big.png`;
    const big = new Uint8Array(10 * 1024 * 1024 + 1); // 10MB + 1 byte
    const stAdmin = authedStorage('adm', { role: 'admin' });
    await expect(
      uploadBytes(sref(stAdmin, objectPath), big, { contentType: 'image/png' }),
    ).rejects.toThrow(/permission/i);
  });
});
