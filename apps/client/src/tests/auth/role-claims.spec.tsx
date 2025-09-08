import React, { useContext } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';

// ---- hoisted state & spies for mocks ----
const {
  navigateSpy,
  registerStoreResetSpy,
  runAllStoreResetsSpy,
  cartResetSpy,
  roleState,
  postSpy,
} = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
  registerStoreResetSpy: vi.fn(),
  runAllStoreResetsSpy: vi.fn(() => cartResetSpy()),
  cartResetSpy: vi.fn(),
  roleState: { value: null as string | null },
  postSpy: vi.fn(),
}));

// mock react-router to capture navigate() calls
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

// mock reset registry & cart store registration
vi.mock('../../state/resetRegistry', () => ({
  registerStoreReset: registerStoreResetSpy,
  runAllStoreResets: runAllStoreResetsSpy,
}));
vi.mock('../../stores/useCartStore', () => ({
  useCartStore: {
    getState: () => ({ reset: cartResetSpy }),
  },
}));

// mock firebase/auth path used by AuthProvider
vi.mock('firebase/auth', async () => {
  const actual: any = await vi.importActual('firebase/auth');
  return {
    ...actual,
    // immediately report "logged-in user"
    onAuthStateChanged: (_auth: any, cb: any) => {
      cb({
        uid: 'u1',
        getIdToken: async () => 't1',
        reload: async () => {},
      } as any);
      return () => {};
    },
    getIdTokenResult: async () => {
      return roleState.value
        ? { claims: { role: roleState.value } }
        : { claims: {} };
    },
    signOut: vi.fn(),
  };
});

// mock backend call used by ensureRoleClaim
vi.mock('../../api/axiosInstance', () => ({
  default: {
    post: postSpy.mockImplementation(async () => {
      // Default behavior: backend sets role to 'viewer' after call
      roleState.value = 'viewer';
      return { status: 200, data: {} };
    }),
  },
}));

// import after mocks
import { AuthProvider, AuthContext } from '../../context/AuthContext';

// a tiny consumer to read role from context
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

describe('AuthProvider role claims bootstrap', () => {
  it('when role missing initially, provider eventually sets a role (via backend + refreshed claims)', async () => {
    // start with no role in claims
    roleState.value = null;

    const qc = new QueryClient();
    renderApp(qc);

    // module registration happened
    expect(registerStoreResetSpy).toHaveBeenCalledTimes(1);

    // role should eventually be set from refreshed claims
    const roleEl = await screen.findByTestId('role');
    await waitFor(() => expect(roleEl.textContent).toBe('viewer'));

    // We don't assert the exact axios call shape to keep this resilient.
    expect(postSpy).toHaveBeenCalled(); // sanity check that backend was contacted
  });

  it('hard-clears and navigates to /login if role still missing after backend', async () => {
    // Backend *does not* set a role this time
    roleState.value = null;
    postSpy.mockImplementationOnce(async () => {
      // no-op: leave roleState.value null
      return { status: 200, data: {} };
    });

    const qc = new QueryClient();
    const clearSpy = vi.spyOn(qc, 'clear');

    renderApp(qc);

    // wait for navigate to be triggered due to failed role bootstrap
    await waitFor(() => expect(navigateSpy).toHaveBeenCalled());

    // hard clear happened
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(runAllStoreResetsSpy).toHaveBeenCalledTimes(1);
    expect(cartResetSpy).toHaveBeenCalledTimes(1);

    // navigated to /login
    const navArg = (navigateSpy.mock.calls[0] ?? [])[0];
    expect(String(navArg)).toMatch(/\/login/);
  });
});
