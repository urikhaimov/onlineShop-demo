// apps/client-e2e/src/utils/stripe.ts
import {
  spawn,
  SpawnOptions,
  ChildProcessWithoutNullStreams,
  execFileSync,
} from 'child_process';

const STRIPE_BIN = process.env.STRIPE_BIN || 'stripe';
const DEFAULT_FORWARD_TO =
  process.env.STRIPE_FORWARD_TO || 'http://localhost:3000/api/webhooks/stripe';

export function runStripe(
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(STRIPE_BIN, args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`stripe exited ${code}`)),
    );
  });
}

/**
 * Trigger *only* payment_intent.succeeded (most stable).
 * We inject orderId/email in multiple places so your webhook can map it.
 */
export async function triggerSucceeded(
  orderId: string,
  email = 'e2e@example.com',
) {
  const args = [
    'trigger',
    'payment_intent.succeeded',
    // PI metadata the backend most commonly reads:
    '--add',
    `payment_intent:metadata[orderId]=${orderId}`,
    '--add',
    `payment_intent:metadata[order_id]=${orderId}`,
    '--add',
    `payment_intent:metadata[email]=${email}`,
    '--add',
    `payment_intent:receipt_email=${email}`,
    // Some backends read charge metadata:
    '--add',
    `charge:metadata[orderId]=${orderId}`,
    '--add',
    `charge:receipt_email=${email}`,
  ];
  await runStripe(args);
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Stripe CLI "listen" helpers to reduce flakiness on Windows & CI
// ─────────────────────────────────────────────────────────────────────────────

export type StripeListenProc = {
  child: ChildProcessWithoutNullStreams;
  /** whsec_... captured from CLI output */
  secret: string;
};

function hasStripeOnPath(): boolean {
  try {
    // Throws if not found. Works cross-platform given STRIPE_BIN.
    execFileSync(STRIPE_BIN, ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Starts `stripe listen` and resolves once it's ready.
 * We consider "ready" when either "Ready!" is printed or a `whsec_...` appears.
 */
export async function startStripeListen(opts?: {
  forwardTo?: string;
  deviceName?: string;
  readyTimeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}): Promise<StripeListenProc> {
  if (!hasStripeOnPath()) {
    throw new Error(
      `Stripe CLI not found ("${STRIPE_BIN}"). Install it or set STRIPE_BIN.`,
    );
  }

  const forwardTo = opts?.forwardTo ?? DEFAULT_FORWARD_TO;
  const deviceName = opts?.deviceName ?? 'e2e';
  const readyTimeoutMs = opts?.readyTimeoutMs ?? 45_000;

  const args = [
    'listen',
    '--forward-to',
    forwardTo,
    '--device-name',
    deviceName,
    '--print-secret',
  ];

  const child = spawn(STRIPE_BIN, args, {
    shell: false,
    env: {
      ...process.env,
      ...opts?.env,
      STRIPE_CLI_TELEMETRY_OPTOUT: '1',
    },
  } as SpawnOptions);

  let secret = '';
  let ready = false;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('stripe listen did not become Ready in time'));
    }, readyTimeoutMs);

    const onData = (buf: Buffer) => {
      const s = buf.toString();

      // Capture webhook secret as soon as it appears
      if (!secret) {
        const m = s.match(/whsec_[A-Za-z0-9]+/);
        if (m) secret = m[0];
      }

      // Accept either classic "Ready!" or presence of secret as readiness
      if (!ready && (s.includes('Ready!') || secret)) {
        ready = true;
        clearTimeout(timeout);
        cleanup();
        resolve();
      }
    };

    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(`stripe listen exited early (code ${code ?? 'null'})`));
    };

    const cleanup = () => {
      child.stdout?.off('data', onData);
      child.stderr?.off('data', onData);
      child.off('exit', onExit);
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', onExit);
  });

  if (!secret) {
    // Very unlikely, but avoids silent misconfig if CLI changed output format
    throw new Error('stripe listen started but no whsec secret found');
  }

  return { child, secret };
}

export async function stopStripeListen(
  proc: StripeListenProc | ChildProcessWithoutNullStreams,
): Promise<void> {
  const child =
    'child' in proc ? (proc.child as ChildProcessWithoutNullStreams) : proc;

  if (!child || child.killed) return;

  try {
    if (process.platform === 'win32') {
      // Kill the whole tree on Windows
      await new Promise<void>((resolve) => {
        const killer = spawn(
          'taskkill',
          ['/pid', String(child.pid), '/t', '/f'],
          {
            shell: true,
            stdio: 'ignore',
          },
        );
        killer.on('exit', () => resolve());
        killer.on('error', () => resolve());
      });
    } else {
      child.kill('SIGTERM');
      // Fallback if still alive after a grace period
      await new Promise((r) => setTimeout(r, 1500));
      try {
        process.kill(child.pid, 0); // throws if not running
        child.kill('SIGKILL');
      } catch {
        /* already dead */
      }
    }
  } catch {
    /* swallow */
  }
}

/**
 * Convenience wrapper:
 *   await withStripeListen(async ({ secret }) => { ...use secret... })
 */
export async function withStripeListen<T>(
  fn: (proc: StripeListenProc) => Promise<T>,
  opts?: {
    forwardTo?: string;
    deviceName?: string;
    readyTimeoutMs?: number;
    env?: NodeJS.ProcessEnv;
  },
): Promise<T> {
  const proc = await startStripeListen(opts);
  try {
    return await fn(proc);
  } finally {
    await stopStripeListen(proc);
  }
}
