// Runs before every test file (configured via jest-e2e.js -> setupFiles)

// ─────────────────────────────────────────────────────────────────────────────
// Default test env + disable rate limiting globally (tests re-enable per-case)
// ─────────────────────────────────────────────────────────────────────────────
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (process.env.DISABLE_RATE_LIMIT === null) {
  process.env.DISABLE_RATE_LIMIT = 'true';
}

// Helper to temporarily enable rate limiting inside a single test
(global as any).withRateLimitEnabled = async <T>(fn: () => Promise<T> | T) => {
  const prev = process.env.DISABLE_RATE_LIMIT;
  try {
    process.env.DISABLE_RATE_LIMIT = 'false';
    return await fn();
  } finally {
    process.env.DISABLE_RATE_LIMIT = prev ?? 'true';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Global, in-memory Firestore mock (+ FieldValue.increment)
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { increment: (n: number) => ({ __incrementBy: n }) },
}));

const __firestoreStore = new Map<string, any>();

function applyPatch(cur: any, patch: any) {
  const next: any = { ...cur };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && '__incrementBy' in (v as any)) {
      const inc = (v as any).__incrementBy as number;
      const curVal = typeof next[k] === 'number' ? (next[k] as number) : 0;
      next[k] = curVal + inc;
    } else {
      next[k] = v;
    }
  }
  return next;
}
function makeDoc(key: string) {
  return {
    async get() {
      const val = __firestoreStore.get(key);
      return {
        exists: val !== undefined,
        get: (field: string) => (val ? val[field] : undefined),
        data: () => val,
      };
    },
    async set(data: any) {
      __firestoreStore.set(key, data);
    },
    async update(patch: any) {
      const cur = __firestoreStore.get(key) || {};
      __firestoreStore.set(key, applyPatch(cur, patch));
    },
  };
}

jest.mock('@common/firebase', () => ({
  _getStore: () => __firestoreStore, // available for assertions in tests
  adminDb: {
    collection: (name: string) => ({
      doc: (id: string) => makeDoc(`${name}/${id}`),
    }),
    runTransaction: async (fn: any) => {
      const tx = {
        get: async (ref: any) => ref.get(),
        set: (ref: any, data: any) => ref.set(data),
        update: (ref: any, patch: any) => ref.update(patch),
      };
      return fn(tx);
    },
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Global helper to mount Stripe raw-body middleware on the Nest app
// Use in specs:  global.applyStripeRaw(app, '/api/payments/webhooks/stripe')
// ─────────────────────────────────────────────────────────────────────────────
import * as bodyParser from 'body-parser';

(global as any).applyStripeRaw = (
  app: any,
  route = '/api/payments/webhooks/stripe',
) => {
  const rawMw = bodyParser.raw({ type: '*/*', limit: '2mb' });
  const ensureRaw = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };
  app.use(route, rawMw, ensureRaw);
  app.use(bodyParser.json());
};

// ─────────────────────────────────────────────────────────────────────────────
// Silence Nest Logger noise in tests
// ─────────────────────────────────────────────────────────────────────────────
import { Logger } from '@nestjs/common';
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
    // Suppress error logs
  });
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
    // Suppress warning logs
  });
  // uncomment if you want full silence:
  // jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
});

// Make store & helpers visible on global for specs
declare global {
  var applyStripeRaw: (app: any, route?: string) => void;

  var __firestoreStore: Map<string, any>;

  var withRateLimitEnabled: <T>(fn: () => Promise<T> | T) => Promise<T>;
}
(global as any).__firestoreStore = __firestoreStore;
