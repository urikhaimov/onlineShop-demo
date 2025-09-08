import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, screen, waitFor, act } from '@testing-library/react';

const { useAuthMock, setRedirectToSpy, setMessageSpy } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({ user: null, loading: false, role: undefined })),
  setRedirectToSpy: vi.fn(),
  setMessageSpy: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../../context/RedirectContext', () => ({
  useRedirect: () => ({
    setRedirectTo: setRedirectToSpy,
    setMessage: setMessageSpy,
  }),
}));

import {
  ProtectedRoute,
  AdminProtectedRoute,
} from '../../components/ProtectedRoutes';

function LoginEcho() {
  const loc = useLocation();
  return (
    <div data-testid="login">
      {loc.pathname}
      {loc.search}
    </div>
  );
}
function Secret() {
  return <div data-testid="secret">Secret</div>;
}

function renderWithRoutes(ui: React.ReactNode, initial = '/secret') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/login" element={<LoginEcho />} />
        <Route path="/secret" element={ui} />
        <Route path="/secret/*" element={ui} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuthMock.mockReset();
  setRedirectToSpy.mockReset();
  setMessageSpy.mockReset();
});

describe('ProtectedRoute', () => {
  it('shows loader while auth is resolving', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true, role: undefined });
    renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login with ?redirect', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      role: undefined,
    });
    renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
      '/secret?x=1',
    );
    const login = await screen.findByTestId('login');
    expect(login.textContent).toContain('/login');
    expect(login.textContent).toContain('redirect=');
    expect(login.textContent).toContain(encodeURIComponent('/secret?x=1'));
  });

  it('renders children when authenticated', () => {
    useAuthMock.mockReturnValue({
      user: { uid: '1' },
      loading: false,
      role: undefined,
    });
    renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });
});

describe('AdminProtectedRoute', () => {
  it('blocks non-admins and redirects to /login', async () => {
    useAuthMock.mockReturnValue({
      user: { uid: '1' },
      role: 'user',
      loading: false,
    });
    renderWithRoutes(
      <AdminProtectedRoute>
        <Secret />
      </AdminProtectedRoute>,
    );
    const login = await screen.findByTestId('login');
    expect(login.textContent).toContain('/login');
    expect(login.textContent).toContain('redirect=');
  });

  it('allows admins', () => {
    useAuthMock.mockReturnValue({
      user: { uid: '1' },
      role: 'admin',
      loading: false,
    });
    renderWithRoutes(
      <AdminProtectedRoute>
        <Secret />
      </AdminProtectedRoute>,
    );
    expect(screen.getByTestId('secret')).toBeInTheDocument();
  });

  it('when role becomes admin after render, content shows', async () => {
    // start logged-in but not admin → should redirect
    const state = {
      user: { uid: '1' } as any,
      role: undefined as any,
      loading: false,
    };
    useAuthMock.mockImplementation(() => state);

    const first = renderWithRoutes(
      <AdminProtectedRoute>
        <Secret />
      </AdminProtectedRoute>,
    );

    // confirm we got redirected
    await screen.findByTestId('login');

    // now promote to admin
    state.role = 'admin';

    // IMPORTANT: unmount the redirected app and remount at /secret
    first.unmount();
    renderWithRoutes(
      <AdminProtectedRoute>
        <Secret />
      </AdminProtectedRoute>,
      '/secret',
    );

    // should render protected content now
    expect(await screen.findByTestId('secret')).toBeInTheDocument();
  });
});

describe('Edge cases & transitions', () => {
  it('encodes complex redirects (query + hash)', async () => {
    useAuthMock.mockReturnValue({
      user: null,
      loading: false,
      role: undefined,
    });
    renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
      '/secret/sub?foo=1&bar=2#section',
    );
    const login = await screen.findByTestId('login');
    expect(login.textContent).toContain('/login');
    expect(login.textContent).toMatch(/redirect=/);
    expect(login.textContent).toContain(
      encodeURIComponent('/secret/sub?foo=1&bar=2#section'),
    );
  });

  it('loading → unauthenticated triggers redirect message exactly once', async () => {
    const state = { user: null as any, role: undefined as any, loading: true };
    useAuthMock.mockImplementation(() => state);

    const view = renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
      '/secret?a=1',
    );
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();

    state.loading = false;
    await act(async () => {
      view.rerender(
        <MemoryRouter initialEntries={['/secret?a=1']}>
          <Routes>
            <Route path="/login" element={<LoginEcho />} />
            <Route
              path="/secret"
              element={
                <ProtectedRoute>
                  <Secret />
                </ProtectedRoute>
              }
            />
            <Route
              path="/secret/*"
              element={
                <ProtectedRoute>
                  <Secret />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    await screen.findByTestId('login');
    expect(setRedirectToSpy).toHaveBeenCalledTimes(1);
    expect(setMessageSpy).toHaveBeenCalledTimes(1);
  });

  it('loading → authenticated shows content (no blank frame)', async () => {
    const state = { user: null as any, role: undefined as any, loading: true };
    useAuthMock.mockImplementation(() => state);

    const view = renderWithRoutes(
      <ProtectedRoute>
        <Secret />
      </ProtectedRoute>,
    );
    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();

    state.loading = false;
    state.user = { uid: '1' };
    await act(async () => {
      view.rerender(
        <MemoryRouter initialEntries={['/secret']}>
          <Routes>
            <Route path="/login" element={<LoginEcho />} />
            <Route
              path="/secret"
              element={
                <ProtectedRoute>
                  <Secret />
                </ProtectedRoute>
              }
            />
            <Route
              path="/secret/*"
              element={
                <ProtectedRoute>
                  <Secret />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId('secret')).toBeInTheDocument(),
    );
  });
});
