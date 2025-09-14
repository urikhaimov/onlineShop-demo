import React, { useContext } from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, act, fireEvent } from '@testing-library/react';

// --- hoisted spies (so vi.mock can see them) ---
const {
  registerStoreResetSpy,
  runAllStoreResetsSpy,
  cartResetSpy,
  signOutSpy,
} = vi.hoisted(() => ({
  registerStoreResetSpy: vi.fn(),
  // simulate "run all resets" -> calls our cart reset
  runAllStoreResetsSpy: vi.fn(() => cartResetSpy()),
  cartResetSpy: vi.fn(),
  signOutSpy: vi.fn(() => Promise.resolve()),
}));

// ---- stub window.location navigation to avoid JSDOM "not implemented" ----
const originalLocation = window.location;
beforeAll(() => {
  // @ts-expect-error redefining for tests
  delete window.location;
  // @ts-expect-error redefining for tests
  window.location = {
    ...originalLocation,
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  };
});
afterAll(() => {
  // @ts-expect-error restore
  window.location = originalLocation;
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// reset registry used by provider
vi.mock('../../state/resetRegistry', () => ({
  registerStoreReset: registerStoreResetSpy,
  runAllStoreResets: runAllStoreResetsSpy,
  __esModule: true,
}));

// store registers on import
vi.mock('../../stores/useCartStore', () => {
  registerStoreResetSpy(cartResetSpy);
  return {
    useCartStore: { getState: () => ({ reset: cartResetSpy }) },
    __esModule: true,
  };
});

// firebase/auth pieces used by AuthProvider
vi.mock('firebase/auth', async () => {
  const actual: any = await vi.importActual('firebase/auth');
  return {
    ...actual,
    onAuthStateChanged: (_auth: any, cb: any) => {
      cb({ uid: 'u1' } as any); // appear logged-in
      return () => {};
    },
    getIdTokenResult: async () => ({ claims: { role: 'viewer' } }),
    signOut: signOutSpy,
    __esModule: true,
  };
});

// ensure the registration side-effect happened
await import('../../stores/useCartStore');

// import after mocks
import { AuthProvider, AuthContext } from '../../context/AuthContext';

// call whichever logout function the provider exposes
function Consumer() {
  const ctx: any = useContext(AuthContext)!;

  const candidates = [
    ctx?.signOut,
    ctx?.logout,
    ctx?.actions?.signOut,
    ctx?.actions?.logout,
    ctx?.hardClear,
    ctx?.actions?.hardClear,
  ].filter(Boolean) as Array<() => unknown | Promise<unknown>>;

  return (
    <button
      data-testid="do-signout"
      onClick={async () => {
        if (!candidates.length)
          throw new Error('No signOut/logout on AuthContext');
        // try the first callable
        await candidates[0]!();
      }}
    >
      sign out
    </button>
  );
}

function renderApp(qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AuthProvider signOut hard-clear', () => {
  it('resets Zustand stores and wipes storage (provider-driven clear)', async () => {
    // seed storage
    localStorage.setItem('cart', 'x');
    localStorage.setItem('profile', 'x');
    localStorage.setItem('auth', 'x');
    localStorage.setItem('zustandPersist:cart', 'x');
    sessionStorage.setItem('cart-storage', 'y');

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    await act(async () => {
      renderApp(qc);
    });

    expect(registerStoreResetSpy).toHaveBeenCalled(); // registered on import

    await act(async () => {
      fireEvent.click(screen.getByTestId('do-signout'));
      await vi.runOnlyPendingTimersAsync(); // drain any provider timers
    });

    // Accept either: provider called central reset registry OR directly reset the cart store
    const totalResets =
      runAllStoreResetsSpy.mock.calls.length + cartResetSpy.mock.calls.length;
    expect(totalResets).toBeGreaterThan(0);

    // storage wiped
    expect(localStorage.getItem('cart')).toBeNull();
    expect(localStorage.getItem('profile')).toBeNull();
    expect(localStorage.getItem('auth')).toBeNull();
    expect(localStorage.getItem('zustandPersist:cart')).toBeNull();
    expect(sessionStorage.getItem('cart-storage')).toBeNull();
  });
});
