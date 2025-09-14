import React, { useContext } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, act } from '@testing-library/react';

// ---- hoisted state & spies for mocks ----
const {
  navigateSpy,
  registerStoreResetSpy,
  runAllStoreResetsSpy,
  cartResetSpy,
  roleState,
  postSpy,
  authCbRef,
  tokenCbRef,
  buildUser,
  fireAuthChange,
} = vi.hoisted(() => {
  const navigateSpy = vi.fn();
  const registerStoreResetSpy = vi.fn();
  const cartResetSpy = vi.fn();
  // runAllStoreResets triggers our cart reset (as the registry would)
  const runAllStoreResetsSpy = vi.fn(() => cartResetSpy());
  const roleState = { value: null as string | null };
  const postSpy = vi.fn();

  // capture auth/token callbacks so tests can re-fire them
  const authCbRef: { current: null | ((u: any) => void) } = { current: null };
  const tokenCbRef: { current: null | ((u: any) => void) } = { current: null };

  const buildUser = () =>
    ({
      uid: 'u1',
      getIdToken: async () => 't1',
      reload: async () => {},
    }) as any;

  const fireAuthChange = (user?: any) => {
    const u = user ?? buildUser();
    authCbRef.current?.(u);
    tokenCbRef.current?.(u); // fire token change too (what AuthProvider usually listens to)
  };

  return {
    navigateSpy,
    registerStoreResetSpy,
    runAllStoreResetsSpy,
    cartResetSpy,
    roleState,
    postSpy,
    authCbRef,
    tokenCbRef,
    buildUser,
    fireAuthChange,
  };
});

beforeEach(() => {
  vi.useFakeTimers();
  // clear persisted flags that can suppress bootstrap flows
  try {
    window.localStorage?.clear?.();
    window.sessionStorage?.clear?.();
  } catch {}
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// make retry/backoff immediate
vi.mock('../../utils/retryWithBackoff', () => ({
  retryWithBackoff: async (fn: any) => fn(),
  __esModule: true,
}));

// mock react-router to capture navigate() calls
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
    __esModule: true,
  };
});

// mock reset registry
vi.mock('../../state/resetRegistry', () => ({
  registerStoreReset: registerStoreResetSpy,
  runAllStoreResets: runAllStoreResetsSpy,
  __esModule: true,
}));

// ---- store mock that REGISTERS on module load ----
vi.mock('../../stores/useCartStore', () => {
  registerStoreResetSpy(cartResetSpy);
  return {
    useCartStore: {
      getState: () => ({ reset: cartResetSpy }),
    },
    __esModule: true,
  };
});

// firebase/auth used by AuthProvider
vi.mock('firebase/auth', async () => {
  const actual: any = await vi.importActual('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: (_auth: any, cb: any) => {
      authCbRef.current = cb;
      cb(buildUser()); // initial sign-in
      return () => {
        authCbRef.current = null;
      };
    },
    onIdTokenChanged: (_auth: any, cb: any) => {
      tokenCbRef.current = cb;
      cb(buildUser()); // initial token read
      return () => {
        tokenCbRef.current = null;
      };
    },
    getIdTokenResult: async () => {
      return roleState.value
        ? { claims: { role: roleState.value } }
        : { claims: {} };
    },
    signOut: vi.fn(),
    __esModule: true,
  };
});

// backend call used by ensureRoleClaim (we still stub it; first test doesn’t depend on it)
vi.mock('../../api/axiosInstance', () => ({
  default: {
    post: postSpy.mockImplementation(async () => {
      roleState.value = 'viewer'; // emulate backend ensuring claim
      return { status: 200, data: {} };
    }),
  },
  __esModule: true,
}));

// ⚠️ Force-load ONLY the real store module so its registration side-effect runs.
await import('../../stores/useCartStore');

// import after mocks
import { AuthProvider, AuthContext } from '../../context/AuthContext';

// tiny consumer to read role from context
function RoleEcho() {
  const ctx = useContext(AuthContext)!;
  return <div data-testid="role">{String(ctx.role)}</div>;
}

function renderApp(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <RoleEcho />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// advance big timer chunks (fast under fake timers)
async function fastForward(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  await Promise.resolve();
}

describe('AuthProvider role claims bootstrap', () => {
  it('when role missing initially, provider eventually sets a role (via refreshed claims)', async () => {
    roleState.value = null;

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      renderApp(qc);
    });

    // simulate "claims refreshed" (no reliance on backend assertion)
    await act(async () => {
      roleState.value = 'viewer';
      fireAuthChange(); // trigger provider to re-read claims (auth + token changed)
      await fastForward(0);
    });

    // module registration happened
    expect(registerStoreResetSpy).toHaveBeenCalledTimes(1);

    // role should eventually reflect refreshed claims
    const roleEl = await screen.findByTestId('role');
    await waitFor(() => expect(roleEl.textContent).toBe('viewer'));
  });

  it('hard-clears and navigates to /login if role still missing after backend', async () => {
    // backend doesn’t add role this time
    roleState.value = null;
    postSpy.mockImplementationOnce(async () => ({ status: 200, data: {} }));

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      renderApp(qc);
    });

    // re-fire auth change a couple times and jump time to drive any give-up logic
    await act(async () => {
      fireAuthChange();
      await fastForward(60_000);
      fireAuthChange();
      await fastForward(120_000);
    });

    await waitFor(() => expect(navigateSpy).toHaveBeenCalled());

    // hard clear happened (registry executed)
    expect(runAllStoreResetsSpy).toHaveBeenCalledTimes(1);
    expect(cartResetSpy).toHaveBeenCalledTimes(1);

    // navigated to /login
    const navArg = (navigateSpy.mock.calls[0] ?? [])[0];
    expect(String(navArg)).toMatch(/\/login/);
  });
});
