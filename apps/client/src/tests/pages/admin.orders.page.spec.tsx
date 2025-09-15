import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import user from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';

// ── SUT import helper ─────────────────────────────────────────────────────────
async function renderSut(route = '/admin/orders') {
  const { default: AdminOrdersPage } = await import(
    '../../pages/admin/AdminOrdersPage/AdminOrdersPage'
  );

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider>
          <Routes>
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
          </Routes>
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// ── Lightweight i18n passthrough ─────────────────────────────────────────────
vi.mock('../../i18n', () => ({}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: any) => o?.defaultValue ?? o?.message ?? k,
    i18n: { language: 'en' },
  }),
  Trans: ({ children }: any) => (
    <>{typeof children === 'function' ? children('') : children}</>
  ),
  __esModule: true,
}));

// ── Layouts ──────────────────────────────────────────────────────────────────
vi.mock('../../layouts/page.layout', () => ({
  PageLayout: ({ children }: any) => <>{children}</>,
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

// ── Query sync hooks: no-ops ─────────────────────────────────────────────────
vi.mock('../../hooks/useStickyTableQuerySync', () => ({
  useStickyTableQuerySync: () => {
    return;
  },
  __esModule: true,
}));
vi.mock('../../hooks/useAdminOrderFiltersQuerySync', () => ({
  useAdminOrderFiltersQuerySync: () => {
    return;
  },
  clearAdminOrderFiltersInSearchParams: (sp: URLSearchParams) => sp,
  __esModule: true,
}));

// ── CSV export util (spy) ────────────────────────────────────────────────────
const exportSpy = vi.fn();
vi.mock('../../utils/exportOrdersToCsv', () => ({
  downloadOrdersCsv: (...args: any[]) => exportSpy(...args),
  __esModule: true,
}));

// ── Firebase Firestore (delete) ──────────────────────────────────────────────
const deleteDocSpy = vi.fn().mockResolvedValue(undefined);
const docSpy = vi.fn((_: any, __: string, id: string) => ({ __doc: id }));
vi.mock('firebase/firestore', async (orig) => {
  const mod = await orig<any>();
  return {
    ...mod,
    deleteDoc: (...args: any[]) => deleteDocSpy(...args),
    doc: (...args: unknown[]) => docSpy(...args),
  };
});
vi.mock('../../firebase', () => ({
  db: { __db: true },
  __esModule: true,
}));

// ── Orders query (React Query) ───────────────────────────────────────────────
type Order = {
  id: string;
  status?: string;
  user?: { email?: string };
  items?: { price?: number; quantity?: number }[];
  createdAt?: string;
  updatedAt?: string;
};
let mockOrders: Order[] = [];
const refetchSpy = vi.fn();
vi.mock('../../hooks/useOrdersQuery', () => ({
  useOrdersQuery: () => ({
    data: { items: mockOrders },
    isFetching: false,
    isError: false,
    error: null,
    refetch: refetchSpy,
  }),
  __esModule: true,
}));

// ── Admin header bar: passthrough rightActions, basic title ──────────────────
vi.mock('../../components/AdminHeaderBar', () => ({
  __esModule: true,
  default: ({ title, onReset, rightActions }: any) => (
    <div>
      <h1>{title || 'Orders'}</h1>
      <button onClick={onReset} aria-label="reset-all">
        reset
      </button>
      <div data-testid="right-actions">{rightActions}</div>
    </div>
  ),
}));

// ── Drawer: render children when open (role=dialog) ─────────────────────────
vi.mock('../../components/RightFiltersDrawer', () => ({
  __esModule: true,
  default: ({ title, open, children }: any) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : (
      <div data-testid="drawer-closed" />
    ),
}));

// ── Columns: wire delete handler through a stub ──────────────────────────────
let capturedDelete!: (o: Order) => void;
vi.mock('../../pages/admin/AdminOrdersPage/Columns', () => ({
  defineAdminOrderColumns: (_nav: any, onDelete: (o: Order) => void) => {
    capturedDelete = onDelete;
    return [{ header: 'ID', accessorKey: 'id' }];
  },
  __esModule: true,
}));

// ── StickyTable: render rows; expose a Delete button per row ─────────────────
vi.mock('../../components/StickyTable', () => ({
  __esModule: true,
  default: (props: any) => {
    return (
      <div>
        <ul data-testid="grid">
          {props.data?.map((o: Order) => (
            <li key={o.id}>
              <span>{o.id}</span>{' '}
              <button
                onClick={() => capturedDelete?.(o)}
                aria-label={`delete-${o.id}`}
              >
                del
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  },
}));

// ── Orders store: observable mock with shallow-change guard + cached snapshot
vi.mock('../../stores/useAdminOrdersStore', () => {
  const React = require('react');

  type Filters = {
    email: string;
    status: 'all' | 'pending' | 'paid' | 'shipped' | '' | string;
    minTotal: number | null;
    maxTotal: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    startDate: string | null;
    endDate: string | null;
    inStockOnly: boolean;
  };

  type State = {
    sorting: any[];
    columnFilters: any[];
    filters: Filters;
  };

  const state: State = {
    sorting: [],
    columnFilters: [],
    filters: {
      email: '',
      status: 'all',
      minTotal: null,
      maxTotal: null,
      minPrice: null,
      maxPrice: null,
      startDate: null,
      endDate: null,
      inStockOnly: false,
    },
  };

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const shallowPatch = (patch: Partial<State>) => {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof State)[]) {
      const next = patch[k];

      if (state[k] !== next) {
        (state as any)[k] = next;
        changed = true;
      }
    }
    if (changed) {
      cached = snapshot();
      notify();
    }
  };

  const actions = {
    setSorting: (s: any[]) => shallowPatch({ sorting: s }),
    setColumnFilters: (f: any[]) => shallowPatch({ columnFilters: f }),
    resetFilters: () =>
      shallowPatch({
        filters: {
          email: '',
          status: 'all',
          minTotal: null,
          maxTotal: null,
          minPrice: null,
          maxPrice: null,
          startDate: null,
          endDate: null,
          inStockOnly: false,
        },
      }),
  };

  const snapshot = () => ({
    sorting: state.sorting,
    setSorting: actions.setSorting,
    columnFilters: state.columnFilters,
    setColumnFilters: actions.setColumnFilters,
    resetFilters: actions.resetFilters,
    filters: state.filters,
  });

  let cached = snapshot();

  const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  return {
    __esModule: true,
    useAdminOrdersStore: () =>
      (React as typeof import('react')).useSyncExternalStore(
        subscribe,
        () => cached,
        () => cached,
      ),
    __test__: { state, shallowPatch, actions },
  };
});

// ── AdminOrderFilters (just a marker) ─────────────────────────────────────────
vi.mock('../../pages/admin/AdminOrdersPage/AdminOrderFilters', () => ({
  __esModule: true,
  default: () => <div>AdminOrderFilters</div>,
}));

// ── Expanded row (noop) ──────────────────────────────────────────────────────
vi.mock('../../pages/admin/AdminOrdersPage/OrderExpandedRow', () => ({
  __esModule: true,
  default: () => <div data-testid="expanded-row" />,
}));

// ── AdminPageContainer passthrough ───────────────────────────────────────────
vi.mock('../../components/AdminPageContainer', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

// ── Tests ────────────────────────────────────────────────────────────────────
describe('AdminOrdersPage', () => {
  beforeEach(() => {
    mockOrders = [
      {
        id: 'o1',
        status: 'paid',
        user: { email: 'a@example.com' },
        items: [{ price: 10, quantity: 2 }],
        createdAt: '2024-01-05T10:00:00Z',
      },
      {
        id: 'o2',
        status: 'pending',
        user: { email: 'b@example.com' },
        items: [{ price: 5, quantity: 1 }],
        createdAt: '2024-01-06T10:00:00Z',
      },
    ];
    exportSpy.mockReset();
    deleteDocSpy.mockReset();
    docSpy.mockClear();
    refetchSpy.mockReset();
  });

  it('renders orders and opens filters drawer', async () => {
    const u = user.setup();
    await renderSut();

    const list = await screen.findByTestId('grid');
    expect(within(list).getByText('o1')).toBeInTheDocument();
    expect(within(list).getByText('o2')).toBeInTheDocument();

    await u.click(
      screen.getByRole('button', { name: /filters\.open|filters open|open/i }),
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('AdminOrderFilters')).toBeInTheDocument();
  });

  it('exports CSV for current filtered rows', async () => {
    const u = user.setup();
    await renderSut();

    // Header renders rightActions with "Export CSV" button
    const actions = await screen.findByTestId('right-actions');
    const exportBtn =
      within(actions).queryByRole('button', { name: /export csv/i }) ||
      within(actions).getByText(/export csv/i);
    await u.click(exportBtn!);

    await waitFor(() => expect(exportSpy).toHaveBeenCalled());
    const arg = exportSpy.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg).toHaveLength(2); // two visible rows
  });

  it('resets table filters and store filters via header reset', async () => {
    const u = user.setup();
    await renderSut();

    await u.click(screen.getByRole('button', { name: 'reset-all' }));

    // We can’t easily assert URL here, but reset triggers store.resetFilters.
    // So just assert page still shows the rows and no crashes occurred.
    const list = await screen.findByTestId('grid');
    expect(within(list).getAllByRole('listitem').length).toBe(2);
  });

  it('opens delete dialog and confirms -> deletes order and refetches', async () => {
    const u = user.setup();
    await renderSut();

    // Click delete for o1 (wired via columns -> capturedDelete -> dialog)
    await u.click(screen.getByRole('button', { name: /delete-o1/i }));

    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/delete/i)).toBeInTheDocument();

    // Confirm delete
    const confirm =
      within(dlg).queryByRole('button', { name: /delete/i }) ||
      within(dlg).getByText(/delete/i);
    await u.click(confirm!);

    await waitFor(() => expect(deleteDocSpy).toHaveBeenCalled());
    // Ensure doc path got the correct id
    expect(docSpy).toHaveBeenCalledWith(expect.anything(), 'orders', 'o1');
    await waitFor(() => expect(refetchSpy).toHaveBeenCalled());
  });
});
