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
  const runAllStoreResetsSpy = vi.fn(() => cartResetSpy());
  const roleState = { value: null as string | null };
  const postSpy = vi.fn();

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
    tokenCbRef.current?.(u);
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
  // use REAL timers here — fake timers can deadlock auth listeners/backoff
  try {
    window.localStorage?.clear?.();
    window.sessionStorage?.clear?.();
  } catch {}
});
afterEach(() => {
  vi.clearAllMocks();
});

// retry/backoff immediate
vi.mock('../../utils/retryWithBackoff', () => ({
  retryWithBackoff: async (fn: any) => fn(),
  __esModule: true,
}));

// react-router navigate and <Navigate/>
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  const Navigate = ({ to }: { to: string }) => {
    (navigateSpy as any)(to);
    return null;
  };
  return {
    ...actual,
    useNavigate: () => navigateSpy,
    Navigate,
    __esModule: true,
  };
});

// reset registry
vi.mock('../../state/resetRegistry', () => ({
  registerStoreReset: registerStoreResetSpy,
  runAllStoreResets: runAllStoreResetsSpy,
  __esModule: true,
}));

// store that registers on module load
vi.mock('../../stores/useCartStore', () => {
  registerStoreResetSpy(cartResetSpy);
  return {
    useCartStore: { getState: () => ({ reset: cartResetSpy }) },
    __esModule: true,
  };
});

// firebase/auth
vi.mock('firebase/auth', async () => {
  const actual: any = await vi.importActual('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: (_auth: any, cb: any) => {
      authCbRef.current = cb;
      // initial sign-in
      cb({ uid: 'u1' } as any);
      return () => {
        authCbRef.current = null;
      };
    },
    onIdTokenChanged: (_auth: any, cb: any) => {
      tokenCbRef.current = cb;
      cb({ uid: 'u1' } as any);
      return () => {
        tokenCbRef.current = null;
      };
    },
    getIdTokenResult: async () =>
      roleState.value ? { claims: { role: roleState.value } } : { claims: {} },
    signOut: vi.fn(),
    __esModule: true,
  };
});

// axiosInstance used by ensureRoleClaim
vi.mock('../../api/axiosInstance', () => ({
  default: {
    post: postSpy.mockImplementation(async () => {
      // emulate server ensuring the custom claim
      roleState.value = 'viewer';
      return { status: 200, data: {} };
    }),
    get: vi.fn(async () => ({ status: 200, data: {} })),
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

describe.sequential('AuthProvider role claims bootstrap', () => {
  it('when role missing initially, provider eventually sets a role (via refreshed claims)', async () => {
    roleState.value = null;
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      renderApp(qc);
    });

    // simulate "claims refreshed"
    await act(async () => {
      roleState.value = 'viewer';
      fireAuthChange(); // trigger provider to re-read claims
    });

    // module registration happened
    expect(registerStoreResetSpy).toHaveBeenCalledTimes(1);

    // role should eventually reflect refreshed claims
    const roleEl = await screen.findByTestId('role');
    await waitFor(() => expect(roleEl.textContent).toBe('viewer'));
  });

  it('hard-clears and navigates to /login if role still missing after backend', async () => {
    roleState.value = null;
    // Backend returns 200 but does NOT add role this time
    postSpy.mockImplementationOnce(async () => ({ status: 200, data: {} }));

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      renderApp(qc);
    });

    // re-fire auth change twice to drive the "give up" logic in provider
    await act(async () => {
      fireAuthChange();
      fireAuthChange();
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
