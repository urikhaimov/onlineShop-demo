// apps/api/test/setup-e2e.ts
// Runs before every test file (configured via jest-e2e.js -> setupFilesAfterEnv)

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
    async create(data: any) {
      if (__firestoreStore.has(key)) {
        throw new Error('Document already exists');
      }
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
        create: (ref: any, data: any) => ref.create(data),
        update: (ref: any, patch: any) => ref.update(patch),
      };
      return fn(tx);
    },
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Global helper to mount raw-body middleware on a specific route
// Use in specs:  global.applyStripeRaw(app, '/api/payments/webhooks/stripe')
//                global.applyStripeRaw(app, '/api/webhooks/wolt')
// ─────────────────────────────────────────────────────────────────────────────
import * as bodyParser from 'body-parser';

(global as any).applyStripeRaw = (app: any, route: string) => {
  // IMPORTANT: raw BEFORE JSON, only on the webhook route
  const rawMw = bodyParser.raw({ type: '*/*', limit: '2mb' });
  const ensureRaw = (req: any, _res: any, next: any) => {
    if (!req.rawBody && Buffer.isBuffer(req.body)) req.rawBody = req.body;
    next();
  };
  app.use(route, rawMw, ensureRaw);

  // Normal JSON parser for the rest (and AFTER the raw-on-route)
  app.use(bodyParser.json());
};

// ─────────────────────────────────────────────────────────────────────────────
import { Logger } from '@nestjs/common';
// Tame noisy logs: hide expected signature failures, keep the rest visible
const _origError = Logger.prototype.error;
const _origWarn = Logger.prototype.warn;

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(function (
    this: any,
    message?: any,
    ...rest: any[]
  ) {
    const msg = String(message ?? '');
    if (/Webhook signature verification failed:/i.test(msg)) {
      return; // swallow expected Stripe signature noise in tests
    }
    return _origError.apply(this, [message, ...rest]);
  });

  jest.spyOn(Logger.prototype, 'warn').mockImplementation(function (
    this: any,
    message?: any,
    ...rest: any[]
  ) {
    const msg = String(message ?? '');
    // Optionally swallow specific, expected warns during tests:
    if (/send(OrderConfirmation|RefundEmail) failed:/i.test(msg)) {
      return;
    }
    return _origWarn.apply(this, [message, ...rest]);
  });
});

afterAll(() => {
  (Logger.prototype.error as jest.Mock)?.mockRestore?.();
  (Logger.prototype.warn as jest.Mock)?.mockRestore?.();
});

// Make store & helpers visible on global for specs
declare global {
  // Helper that mounts raw-body on a specific route (must be called before app.init())
  var applyStripeRaw: (app: any, route: string) => void;

  // In-memory Firestore backing store
  var __firestoreStore: Map<string, any>;

  // Utility to temporarily enable the rate limiter inside a test
  var withRateLimitEnabled: <T>(fn: () => Promise<T> | T) => Promise<T>;
}
(global as any).__firestoreStore = __firestoreStore;

export {};
