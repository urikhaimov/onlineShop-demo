// src/tests/pages/admin.users.page.spec.tsx
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks (hoisted) ────────────────────────────────────────────────────────────

// No-op URL sync
vi.mock('../../hooks/useStickyTableQuerySync', () => ({
  useStickyTableQuerySync: () => {},
}));

// Bypass auth/guards
vi.mock('../../layouts/page.layout', () => ({
  __esModule: true,
  PageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Minimal i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// Optional UI store
vi.mock('../../stores/useAdminUsersUIStore', () => ({
  useAdminUsersUIStore: () => ({ openConfirm: vi.fn() }),
}));

// Columns: return handlers bag directly
vi.mock('../../pages/admin/AdminUsersPage/Columns', () => ({
  // type any to avoid test-time type coupling
  defineUserColumns: (handlers: any) => handlers as any,
}));

// StickyTable mock: very small renderer using handlers
vi.mock('../../components/StickyTable', () => ({
  __esModule: true,
  default: (props: any) => {
    const { data, columns } = props;
    return (
      <div>
        {data.map((u: any) => (
          <div key={u.id} data-testid={`row-${u.id}`}>
            <span>{u.email}</span>
            <label htmlFor={`role-${u.id}`}>Role</label>
            <select
              id={`role-${u.id}`}
              aria-label={`role-${u.id}`}
              value={u.role}
              onChange={(e) => columns.onChangeRole(u.id, e.target.value)}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
            <button
              type="button"
              aria-label={`edit-${u.id}`}
              onClick={() => columns.onEditClicked(u)}
            >
              Edit
            </button>
            <button
              type="button"
              aria-label={`delete-${u.id}`}
              onClick={() => columns.onDeleteClicked(u)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

// Data/hooks
vi.mock('../../hooks/useAdminUsersQuery', () => ({
  useAdminUsersQuery: vi.fn(),
}));

// ── Imports after mocks ────────────────────────────────────────────────────────
import { useAdminUsersQuery } from '../../hooks/useAdminUsersQuery';

// helper: render with providers
function renderWithProviders(
  ui: React.ReactElement,
  initialEntry = '/admin/users',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider maxSnack={3}>
          <QueryClientProvider client={client}>{ui}</QueryClientProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// dynamic import so Vite resolves the page correctly
async function loadPage() {
  const mod = await import('../../pages/admin/AdminUsersPage/AdminUsersPage');
  return mod.default as React.ComponentType;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────
const users = [
  { id: 'u1', email: 'a@acme.com', role: 'user' },
  { id: 'u2', email: 'b@acme.com', role: 'admin' },
];

const updateUserRole = vi.fn(async (_id: string, _role: string) => {});
const deleteUser = vi.fn(async (_id: string) => {});

beforeEach(() => {
  (useAdminUsersQuery as unknown as vi.Mock).mockReturnValue({
    users,
    isLoading: false,
    error: null,
    updateUserRole,
    deleteUser,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Specs ─────────────────────────────────────────────────────────────────────
describe('AdminUsersPage', () => {
  it('shows loading gate', async () => {
    (useAdminUsersQuery as unknown as vi.Mock).mockReturnValue({
      users: [],
      isLoading: true,
      error: null,
      updateUserRole,
      deleteUser,
    });

    const Page = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/users" element={<Page />} />
      </Routes>,
    );

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows error state', async () => {
    (useAdminUsersQuery as unknown as vi.Mock).mockReturnValue({
      users: [],
      isLoading: false,
      error: new Error('boom'),
      updateUserRole,
      deleteUser,
    });

    const Page = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/users" element={<Page />} />
      </Routes>,
    );

    expect(screen.getByText(/Error loading users/i)).toBeInTheDocument();
  });

  it('renders users and supports inline role change', async () => {
    const Page = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/users" element={<Page />} />
      </Routes>,
    );

    // rows visible
    expect(screen.getByTestId('row-u1')).toBeInTheDocument();
    expect(screen.getByTestId('row-u2')).toBeInTheDocument();

    // change role for u1 (user -> admin)
    const select = screen.getByLabelText('role-u1') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'admin' } });

    await waitFor(() =>
      expect(updateUserRole).toHaveBeenCalledWith('u1', 'admin'),
    );
  });

  it('opens edit dialog, updates role, then closes', async () => {
    const Page = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/users" element={<Page />} />
      </Routes>,
    );

    // open edit for u1
    fireEvent.click(screen.getByLabelText('edit-u1'));

    // limit queries to the dialog to avoid duplicate matches
    const dialog = await screen.findByRole('dialog');

    // dialog shows email and helper text
    expect(within(dialog).getByText(/Change role for/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/^a@acme\.com$/i)).toBeInTheDocument();

    // MUI Select uses role="combobox"
    const combo = within(dialog).getByRole('combobox');
    fireEvent.mouseDown(combo);

    const superOpt = await screen.findByRole('option', { name: /superadmin/i });
    fireEvent.click(superOpt);

    // save
    const saveBtn = within(dialog).getByRole('button', { name: /^save$/i });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(updateUserRole).toHaveBeenCalledWith('u1', 'superadmin'),
    );

    // dialog closed
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('opens delete dialog and confirms delete', async () => {
    const Page = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/users" element={<Page />} />
      </Routes>,
    );

    fireEvent.click(screen.getByLabelText('delete-u2'));

    expect(await screen.findByText(/Delete user\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith('u2'));

    // dialog closes
    await waitFor(() =>
      expect(screen.queryByText(/Delete user\?/i)).not.toBeInTheDocument(),
    );
  });
});
