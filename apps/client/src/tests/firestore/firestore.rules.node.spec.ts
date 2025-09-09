import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertFails,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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
const FIRESTORE_RULES_PATH = path.join(REPO_ROOT, 'firestore.rules');
const FIRESTORE_RULES = fs.readFileSync(FIRESTORE_RULES_PATH, 'utf8');

let testEnv: RulesTestEnvironment;

function authedDb(uid: string, claims?: Record<string, any>) {
  return testEnv.authenticatedContext(uid, claims).firestore();
}
function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

async function seed(fn: (db: ReturnType<typeof authedDb>) => Promise<void>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await fn(db);
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: FIRESTORE_RULES },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore security rules', () => {
  describe('products (public read; admin/superadmin write)', () => {
    const pid = `t_prod_${Date.now()}`;

    it('public can read products', async () => {
      await seed(async (db) => {
        await setDoc(doc(db, 'products', pid), { name: 'P', price: 10 });
      });
      const snap = await getDoc(doc(unauthDb(), 'products', pid));
      expect(snap.exists()).toBe(true);
    });

    it('non-admin cannot create', async () => {
      const db = authedDb('u1', { role: 'user' });
      await assertFails(
        setDoc(doc(db, 'products', `deny_${Date.now()}`), { name: 'X' }),
      );
    });

    it('admin can create/update/delete', async () => {
      const db = authedDb('adm1', { role: 'admin' });
      const id = `adm_${Date.now()}`;
      const ref = doc(db, 'products', id);
      await setDoc(ref, { name: 'A', price: 1 });
      await updateDoc(ref, { price: 2 });
      await deleteDoc(ref);
    });
  });

  describe('categories/themes/landingPage mirror products policy', () => {
    const makeTests = (coll: string) => {
      const id = `t_${coll}_${Date.now()}`;
      it(`${coll}: public can read`, async () => {
        await seed(async (db) => {
          await setDoc(doc(db, coll, id), { name: 'X' });
        });
        const snap = await getDoc(doc(unauthDb(), coll, id));
        expect(snap.exists()).toBe(true);
      });

      it(`${coll}: non-admin cannot create`, async () => {
        const db = authedDb('u1', { role: 'user' });
        await assertFails(
          setDoc(doc(db, coll, `deny_${Date.now()}`), { name: 'Y' }),
        );
      });

      it(`${coll}: admin can create/update/delete`, async () => {
        const db = authedDb('adm', { role: 'admin' });
        const rid = `ok_${Date.now()}`;
        const ref = doc(db, coll, rid);
        await setDoc(ref, { name: 'A' });
        await updateDoc(ref, { name: 'B' });
        await deleteDoc(ref);
      });
    };

    makeTests('categories');
    makeTests('themes');
    makeTests('landingPage');
  });

  describe('users', () => {
    it('owner can create and read own user doc', async () => {
      const uid = `u_${Date.now()}`;
      const db = authedDb(uid, { role: 'user' });
      const ref = doc(db, 'users', uid);
      await setDoc(ref, { name: 'Me' });
      const snap = await getDoc(ref);
      expect(snap.exists()).toBe(true);
    });

    it('cannot read other user doc', async () => {
      const uidA = `a_${Date.now()}`;
      const uidB = `b_${Date.now()}`;
      await seed(async (db) => {
        await setDoc(doc(db, 'users', uidA), { name: 'A' });
      });
      const dbB = authedDb(uidB, { role: 'user' });
      await assertFails(getDoc(doc(dbB, 'users', uidA)));
    });
  });

  describe('orders', () => {
    it('user can create an order for self', async () => {
      const uid = `o_${Date.now()}`;
      const db = authedDb(uid, { role: 'user' });
      const ref = doc(db, 'orders', `ord_${Date.now()}`);
      await setDoc(ref, { userId: uid, payment: { status: 'pending' } });
      const snap = await getDoc(ref);
      expect(snap.exists()).toBe(true);
    });

    it('user cannot set payment.status to paid (only admin)', async () => {
      const uid = `u_${Date.now()}`;
      const orderId = `ord_${Date.now()}`;

      await seed(async (db) => {
        await setDoc(doc(db, 'orders', orderId), {
          userId: uid,
          payment: { status: 'pending' },
          internalTags: [],
          delivery: { sla: 'std' },
        });
      });

      const dbUser = authedDb(uid, { role: 'user' });
      await assertFails(
        updateDoc(doc(dbUser, 'orders', orderId), {
          payment: { status: 'paid' },
        }),
      );

      const dbAdmin = authedDb('adm', { role: 'admin' });
      await updateDoc(doc(dbAdmin, 'orders', orderId), {
        payment: { status: 'paid' },
      });
    });
  });

  describe('abandonedCarts', () => {
    it('user can create/update/get/delete own abandoned cart', async () => {
      const uid = `u_${Date.now()}`;
      const clientSecret = `cs_${Date.now()}`;
      const db = authedDb(uid, { role: 'user' });
      const ref = doc(db, 'abandonedCarts', clientSecret);
      await setDoc(ref, { userId: uid, items: [] });

      const snap = await getDoc(ref);
      expect(snap.exists()).toBe(true);

      await updateDoc(ref, { items: [{ id: 'p1', qty: 1 }] });
      await deleteDoc(ref);

      const otherDb = authedDb('other', { role: 'user' });
      await assertFails(getDoc(doc(otherDb, 'abandonedCarts', clientSecret)));
    });
  });
});
