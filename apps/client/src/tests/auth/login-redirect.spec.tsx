import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { render, screen, act } from '@testing-library/react';

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({
    user: null,
    loading: false,
    role: null,
    signInWithEmail: vi.fn(async () => {}),
  })),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../../context/RedirectContext', () => ({
  useRedirect: () => ({ setRedirectTo: vi.fn(), setMessage: vi.fn() }),
}));

// ---- fake login page that consumes ?redirect=... like your real page should
function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const redirect = params.get('redirect');
  return (
    <button
      data-testid="login-button"
      onClick={() => {
        // simulate successful credential login via context
        const ctx = useAuthMock();
        ctx.signInWithEmail?.({ email: 'a@b.com', password: 'x' });

        const target = redirect ? decodeURIComponent(redirect) : '/';
        nav(target);
      }}
    >
      Sign in
    </button>
  );
}

function Secret() {
  return <div data-testid="secret">Secret</div>;
}
function ProtectedEcho() {
  return <div data-testid="protected">Protected</div>;
}

describe('Login page redirect consumption', () => {
  it('navigates to redirect target after successful login', async () => {
    // ✅ Use a nested path so it matches "/secret/*" and renders <Secret />
    const target = '/secret/sub?foo=1#x';

    render(
      <MemoryRouter
        initialEntries={['/login?redirect=' + encodeURIComponent(target)]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/secret" element={<ProtectedEcho />} />
          <Route path="/secret/*" element={<Secret />} />
        </Routes>
      </MemoryRouter>,
    );

    await act(async () => {
      screen.getByTestId('login-button').click();
    });

    // lands on /secret/sub?foo=1#x (matched by /secret/*)
    expect(await screen.findByTestId('secret')).toBeInTheDocument();
  });
});
