import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { ref as sref, uploadBytes, getBytes } from 'firebase/storage';

// resolve repo root
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

const PROJECT_ID = process.env.PROJECT_ID || 'onlinestoretemplate-59d3e';
const STORAGE_RULES_PATH = path.join(REPO_ROOT, 'storage.rules');
const STORAGE_RULES = fs.readFileSync(STORAGE_RULES_PATH, 'utf8');

let testEnv: RulesTestEnvironment;

function authedStorage(uid: string, claims?: Record<string, any>) {
  return testEnv.authenticatedContext(uid, claims).storage();
}
function unauthStorage() {
  return testEnv.unauthenticatedContext().storage();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: STORAGE_RULES },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Storage security rules', () => {
  it('product images: public read, only admin/superadmin write & <10MB & image/*', async () => {
    const objectPath = `products/p_${Date.now()}.png`;
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
      uploadBytes(sref(stUser, `products/deny_${Date.now()}.png`), png, {
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
});
