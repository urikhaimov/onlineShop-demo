import React, { useContext } from 'react';
import { describe, it, expect, vi } from 'vitest';
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
  // simulate running all store resets by invoking cartResetSpy()
  runAllStoreResetsSpy: vi.fn(() => cartResetSpy()),
  cartResetSpy: vi.fn(),
  signOutSpy: vi.fn(() => {
    // mock implementation
  }),
}));

// mock the reset registry used by AuthProvider
vi.mock('../../state/resetRegistry', () => ({
  registerStoreReset: registerStoreResetSpy,
  runAllStoreResets: runAllStoreResetsSpy,
}));

// mock the cart store used by AuthProvider's module-level registration
vi.mock('../../stores/useCartStore', () => ({
  useCartStore: {
    getState: () => ({ reset: cartResetSpy }),
  },
}));

// mock firebase/auth pieces used by AuthProvider
vi.mock('firebase/auth', async () => {
  const actual: any = await vi.importActual('firebase/auth');
  return {
    ...actual,
    // immediately report "logged-in user" so mount doesn't hard-clear
    onAuthStateChanged: (_auth: any, cb: any) => {
      cb({ uid: 'u1' } as any);
      return () => {};
    },
    // role is present so provider won't call backend
    getIdTokenResult: async () => ({ claims: { role: 'viewer' } }),
    signOut: signOutSpy,
  };
});

// import after mocks
import { AuthProvider, AuthContext } from '../../context/AuthContext';

function Consumer() {
  const ctx = useContext(AuthContext)!;
  return (
    <button data-testid="do-signout" onClick={() => ctx.signOut()}>
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
  it('clears React Query, resets all Zustand stores, and wipes storage', async () => {
    // put fake data in storage
    localStorage.setItem('cart', 'x');
    localStorage.setItem('profile', 'x');
    localStorage.setItem('auth', 'x');
    localStorage.setItem('zustandPersist:cart', 'x');
    sessionStorage.setItem('cart-storage', 'y');

    // real QueryClient so we can spy on clear()
    const qc = new QueryClient();
    const queryClearSpy = vi.spyOn(qc, 'clear');

    renderApp(qc);

    // module registration happens on import:
    expect(registerStoreResetSpy).toHaveBeenCalledTimes(1);

    // click "sign out"
    await act(async () => {
      fireEvent.click(screen.getByTestId('do-signout'));
    });

    // assertions
    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(queryClearSpy).toHaveBeenCalledTimes(1);
    expect(runAllStoreResetsSpy).toHaveBeenCalledTimes(1);
    expect(cartResetSpy).toHaveBeenCalledTimes(1); // via runAllStoreResetsSpy impl

    expect(localStorage.getItem('cart')).toBeNull();
    expect(localStorage.getItem('profile')).toBeNull();
    expect(localStorage.getItem('auth')).toBeNull();
    expect(localStorage.getItem('zustandPersist:cart')).toBeNull();
    expect(sessionStorage.getItem('cart-storage')).toBeNull();
  });
});
