import {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  vi,
  type MockedFunction,
} from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ---- Mocks (hoisted by Vitest) ----
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'admin-1', email: 'admin@test.com' },
    claims: { roles: ['admin'] },
    isAdmin: true,
    hasRole: (role: string) => role === 'admin' || role === 'superadmin',
  }),
}));

// i18n: fully stub react-i18next (avoid NO_I18NEXT_INSTANCE)
vi.mock('react-i18next', () => {
  return {
    useTranslation: () => ({
      t: (key: string, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key,
      i18n: { language: 'en' },
    }),
    Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    initReactI18next: {
      type: '3rdParty',
      init: () => {
        /** no-op */
      },
    },
  };
});

// Bypass PageLayout/guards so page content actually renders in tests
vi.mock('../../layouts/page.layout', () => ({
  __esModule: true,
  PageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---- Mock hooks used by the page ----
vi.mock('../../hooks/useOrder', async () => {
  const actual = await vi.importActual<typeof import('../../hooks/useOrder')>(
    '../../hooks/useOrder',
  );
  return {
    ...actual,
    useOrder: vi.fn(),
    useUpdateOrder: vi.fn(),
  };
});

import * as orderHooks from '../../hooks/useOrder';

// Strongly-typed handles to the mocked hooks
type UseOrderFn = typeof orderHooks.useOrder;
type UseUpdateOrderFn = typeof orderHooks.useUpdateOrder;

const useOrderMock =
  orderHooks.useOrder as unknown as MockedFunction<UseOrderFn>;
const useUpdateOrderMock =
  orderHooks.useUpdateOrder as unknown as MockedFunction<UseUpdateOrderFn>;

// utility: render with providers
function renderWithProviders(
  ui: React.ReactElement,
  initialEntry = '/admin/orders/1/edit', // NOTE the /admin prefix
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

// dynamic import so Vite resolves the correct file
async function loadPage() {
  const mod = await import(
    '../../pages/admin/AdminEditOrderPage/EditOrderPage'
  );
  const EditOrderPage = mod.default as React.ComponentType;
  return EditOrderPage;
}

// common order fixture
const orderFixture: orderHooks.Order = {
  id: 'o1',
  status: 'pending',
  notes: 'Initial notes',
  delivery: { provider: 'UPS', trackingNumber: '1Z123', eta: '2025-09-20' },
  items: [],
} as orderHooks.Order;

let mutateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // emulate tanstack mutation signature: mutate(variables, { onSuccess, onError })
  mutateSpy = vi.fn(
    (
      _: unknown,
      opts?: { onSuccess?: () => void; onError?: (e: unknown) => void },
    ) => {
      opts?.onSuccess?.();
    },
  );

  // Minimal shape of your mutation object
  useUpdateOrderMock.mockReturnValue({
    mutate: mutateSpy as any, // ok: we only rely on mutate + status in tests
    status: 'idle',
  } as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('EditOrderPage', () => {
  it('shows loading gate', async () => {
    useOrderMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
    } as any);

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('shows error message if hook errors', async () => {
    useOrderMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as any);

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    expect(await screen.findByText(/Error loading order/i)).toBeInTheDocument();
  });

  it('renders order and updates status + notes, then saves (mutate once)', async () => {
    useOrderMock.mockReturnValue({
      data: orderFixture,
      isLoading: false,
      isError: false,
      error: undefined,
    } as any);

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    // Status (MUI Select shows as combobox or button with accessible name)
    let statusControl: HTMLElement | null = null;
    try {
      statusControl = await screen.findByRole('combobox', { name: /status/i });
    } catch {
      // fall through to the button role
    }
    if (!statusControl) {
      statusControl = await screen.findByRole('button', { name: /status/i });
    }
    fireEvent.mouseDown(statusControl!);

    const shipped = await screen.findByRole('option', { name: /shipped/i });
    fireEvent.click(shipped);

    const notes = screen.getByLabelText(/internal notes/i);
    fireEvent.change(notes, { target: { value: 'Updated notes' } });

    // Save (button may be "Save Changes" or "Save")
    let saveBtn: HTMLElement | null = screen.queryByRole('button', {
      name: /save changes/i,
    });
    if (!saveBtn) saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn!);

    await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
    const payload = (mutateSpy.mock.calls[0] as unknown[])[0] as any;

    expect(payload.status).toBe('shipped');
    expect(payload.notes).toBe('Updated notes');
    expect(payload.previousStatus).toBe('pending');
  });

  it('guards against double submit (still calls mutate only once)', async () => {
    useOrderMock.mockReturnValue({
      data: orderFixture,
      isLoading: false,
      isError: false,
      error: undefined,
    } as any);

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    let saveBtn: HTMLElement | null = await screen
      .findByRole('button', { name: /save changes/i })
      .catch(() => null);
    if (!saveBtn)
      saveBtn = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);

    await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
  });

  it('shows snackbar on error', async () => {
    useOrderMock.mockReturnValue({
      data: orderFixture,
      isLoading: false,
      isError: false,
      error: undefined,
    } as any);

    mutateSpy.mockImplementation(
      (_payload: unknown, opts?: { onError?: (e: unknown) => void }) => {
        opts?.onError?.(new Error('network fail'));
      },
    );

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    let saveBtn: HTMLElement | null = await screen
      .findByRole('button', { name: /save changes/i })
      .catch(() => null);
    if (!saveBtn)
      saveBtn = await screen.findByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);

    await screen.findByText(/network fail/i);
  });

  it('lets user fill delivery fields', async () => {
    useOrderMock.mockReturnValue({
      data: orderFixture,
      isLoading: false,
      isError: false,
      error: undefined,
    } as any);

    const EditOrderPage = await loadPage();
    renderWithProviders(
      <Routes>
        <Route path="/admin/orders/:id/edit" element={<EditOrderPage />} />
      </Routes>,
    );

    fireEvent.change(screen.getByLabelText(/provider/i), {
      target: { value: 'FedEx' },
    });
    fireEvent.change(screen.getByLabelText(/tracking number/i), {
      target: { value: 'TRK-999' },
    });
    fireEvent.change(screen.getByLabelText(/eta/i), {
      target: { value: '2025-10-01' },
    });

    let saveBtn: HTMLElement | null = screen.queryByRole('button', {
      name: /save changes/i,
    });
    if (!saveBtn) saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn!);

    await waitFor(() => expect(mutateSpy).toHaveBeenCalledTimes(1));
    const payload = (mutateSpy.mock.calls[0] as unknown[])[0] as any;

    expect(payload.delivery).toEqual({
      provider: 'FedEx',
      trackingNumber: 'TRK-999',
      eta: '2025-10-01',
    });
  });
});
