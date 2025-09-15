import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';

// ── Mocks (all paths are relative to apps/client/src/tests/pages) ─────────────

// Page layout
vi.mock('../../layouts/page.layout', () => ({
  PageLayout: ({ children }: any) => <>{children}</>,
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

// i18n: passthrough
vi.mock('../../i18n', () => ({}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: any) => o?.defaultValue ?? k }),
  Trans: ({ children }: any) => (
    <>{typeof children === 'function' ? children('') : children}</>
  ),
  __esModule: true,
}));

// categories
vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    data: [
      { id: 'c1', name: 'Cat 1' },
      { id: 'c2', name: 'Cat 2' },
    ],
  }),
  __esModule: true,
}));

// products query
type Prod = {
  id: string;
  name: string;
  categoryId?: string;
  price?: number;
  stock?: number;
  createdAt?: string;
  updatedAt?: string;
};
let mockItems: Prod[] = [];
vi.mock('../../hooks/useProductsQuery', () => ({
  useProductsQuery: () => ({
    data: { items: mockItems },
    isFetching: false,
    isError: false,
    error: null,
  }),
  __esModule: true,
}));

// ── Admin store (observable mock with STABLE action identities) ───────────────
// ── Admin store (observable mock: shallow-change guard + cached snapshot) ─────
vi.mock('../../stores/useAdminProductsStore', () => {
  const React = require('react');

  type P = { id: string; name: string };

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const state = {
    products: [] as P[],
    loading: false,
    sorting: [] as any[],
    columnFilters: [] as any[],
    filtersOpen: false,
  };

  // Build once; keep stable action identities.
  const applyPatch = (patch: Partial<typeof state>): boolean => {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof typeof state)[]) {
      if (state[k] !== patch[k]) {
        // @ts-expect-error indexed write
        state[k] = patch[k];
        changed = true;
      }
    }
    return changed;
  };

  const setState = (patch: Partial<typeof state>) => {
    if (applyPatch(patch)) {
      // refresh cached snapshot only when something actually changed
      cachedSnapshot = buildSnapshot();
      notify();
    }
  };

  const actions = {
    setProducts: (p: P[]) => setState({ products: p }),
    setProductsSorted: (p: P[]) => setState({ products: p }),
    setLoading: (b: boolean) => setState({ loading: b }),
    setSorting: (s: any[]) => setState({ sorting: s }),
    setColumnFilters: (f: any[]) => setState({ columnFilters: f }),
    setFiltersOpen: (b: boolean) => setState({ filtersOpen: b }),
  };

  const buildSnapshot = () => ({
    products: state.products,
    loading: state.loading,
    sorting: state.sorting,
    columnFilters: state.columnFilters,
    filtersOpen: state.filtersOpen,
    ...actions, // stable refs
  });

  let cachedSnapshot: any = buildSnapshot();

  const getSnapshot = () => cachedSnapshot;

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // Add an explicit export for __test__ to satisfy TypeScript
  return {
    __esModule: true,
    useAdminProductsStore: () =>
      (React as typeof import('react')).useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot,
      ),
    __test__: { setState, state },

    __type: {} as {
      __test__: { setState: typeof setState; state: typeof state };
    },
  };
});

// shared product filters
const filterState = {
  searchTerm: '',
  selectedCategoryId: '',
  minPrice: 0,
  maxPrice: 100000,
  minStock: 0,
  maxStock: 1000,
  updatedFrom: null as any,
  updatedTo: null as any,
};
vi.mock('../../stores/useProductStore', () => ({
  useProductStore: () => ({
    ...filterState,
    setSearchTerm: (v: string) => (filterState.searchTerm = v),
    setSelectedCategoryId: (v: string) => (filterState.selectedCategoryId = v),
    setMinPrice: (n: number) => (filterState.minPrice = n),
    setMaxPrice: (n: number) => (filterState.maxPrice = n),
    setMinStock: (n: number) => (filterState.minStock = n),
    setMaxStock: (n: number) => (filterState.maxStock = n),
    setUpdatedFrom: (v: any) => (filterState.updatedFrom = v),
    setUpdatedTo: (v: any) => (filterState.updatedTo = v),
  }),
  __esModule: true,
}));

// sticky/query sync hooks: no-ops
vi.mock('../../hooks/useStickyTableQuerySync', () => ({
  useStickyTableQuerySync: () => {
    // noop
  },
  __esModule: true,
}));
vi.mock('../../hooks/useAdminProductFiltersQuerySync', () => ({
  useAdminProductFiltersQuerySync: () => {
    // noop
  },
  clearAdminProductFiltersInSearchParams: (sp: URLSearchParams) => sp,
  __esModule: true,
}));

// mutations
const reorderSpy = vi.fn();
const removeSpy = vi.fn();
vi.mock('../../hooks/useProductMutations', () => ({
  useProductMutations: () => ({
    reorder: { mutateAsync: reorderSpy },
    remove: { mutateAsync: removeSpy },
  }),
  __esModule: true,
}));

// firebase
vi.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: async () => 'tok',
    },
  },
  __esModule: true,
}));

// AdminHeaderBar — tiny passthrough
vi.mock('../../components/AdminHeaderBar', () => ({
  default: ({ title, rightActions }: any) => (
    <div>
      <h1>{title || 'Admin Products'}</h1>
      <div data-testid="right-actions">{rightActions}</div>
    </div>
  ),
  __esModule: true,
}));

// RightFiltersDrawer — show children when open
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

// AdminProductFilters — simple marker
vi.mock('../../pages/admin/AdminProductsPage/AdminProductFilters', () => ({
  __esModule: true,
  default: () => <div>AdminProductFilters</div>,
}));

// ProductExpandedRow — noop
vi.mock('../../pages/admin/AdminProductsPage/ProductExpandedRow', () => ({
  __esModule: true,
  default: () => <div data-testid="expanded-row" />,
}));

// Columns — capture delete dialog hook
let columnsDeleteHook: ((p: Prod) => void) | null = null;
vi.mock('../../pages/admin/AdminProductsPage/Columns', () => ({
  useProductColumns: (_cats: any, _nav: any, openDeleteDialog: any) => {
    columnsDeleteHook = openDeleteDialog;
    return [{ header: 'Name', accessorKey: 'name' }];
  },
  __esModule: true,
}));

// StickyTable — render items and provide buttons to simulate reorder/delete
vi.mock('../../components/StickyTable', () => ({
  __esModule: true,
  default: (props: any) => {
    const ids = props.data?.map((p: any) => p.id) ?? [];
    return (
      <div>
        <ul data-testid="grid">
          {props.data?.map((p: any) => (
            <li key={p.id}>
              <span>{p.name}</span>{' '}
              <button
                onClick={() => columnsDeleteHook?.(p)}
                aria-label={`delete-${p.id}`}
              >
                del
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => props.onReorder?.([...ids].reverse())}
          aria-label="apply-reorder"
        >
          reorder
        </button>
      </div>
    );
  },
}));

// ── SUT import helper (correct relative path) ─────────────────────────────────
async function renderSut(route = '/admin/products') {
  const { default: AdminProductsPage } = await import(
    '../../pages/admin/AdminProductsPage/AdminProductsPage'
  );

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider>
          <Routes>
            <Route path="/admin/products" element={<AdminProductsPage />} />
          </Routes>
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AdminProductsPage', () => {
  beforeEach(async () => {
    mockItems = [
      { id: 'p1', name: 'Prod 1', categoryId: 'c1' },
      { id: 'p2', name: 'Prod 2', categoryId: 'c2' },
      { id: 'p3', name: 'Prod 3', categoryId: 'c1' },
    ];

    // seed the mocked admin store via its exposed test helper (dynamic import)
    const { __test__: adminStoreTest } = await import(
      '../../stores/useAdminProductsStore'
    );
    adminStoreTest.setState({
      products: mockItems.slice(),
      loading: false,
      sorting: [],
      columnFilters: [],
      filtersOpen: false,
    });

    Object.assign(filterState, {
      searchTerm: '',
      selectedCategoryId: '',
      minPrice: 0,
      maxPrice: 100000,
      minStock: 0,
      maxStock: 1000,
      updatedFrom: null,
      updatedTo: null,
    });

    reorderSpy.mockReset();
    removeSpy.mockReset();
  });

  it('renders products and opens filters drawer', async () => {
    const u = user.setup();
    await renderSut();

    const list = await screen.findByTestId('grid');
    expect(within(list).getAllByText(/Prod \d/).length).toBe(3);

    await u.click(screen.getByRole('button', { name: /filters\.open|open/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('AdminProductFilters')).toBeInTheDocument();
  });

  it('toggles reorder mode and triggers onReorder -> calls reorder.mutateAsync', async () => {
    const u = user.setup();
    await renderSut();

    const toggle =
      screen.getByRole('button', { name: /reorder: off/i }) ||
      screen.getByRole('button', { name: /reorder/i });
    await u.click(toggle);
    expect(
      screen.getByRole('button', { name: /reorder: on/i }),
    ).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'apply-reorder' }));
    await waitFor(() => expect(reorderSpy).toHaveBeenCalled());
    expect(reorderSpy).toHaveBeenCalledTimes(1);
  });

  it('opens delete dialog and confirms -> calls remove.mutateAsync', async () => {
    const u = user.setup();
    await renderSut();

    await u.click(screen.getByRole('button', { name: 'delete-p1' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/delete product\?/i)).toBeInTheDocument();

    const confirm =
      within(dlg).queryByRole('button', { name: /delete/i }) ||
      within(dlg).getByText(/delete/i);
    await u.click(confirm!);

    await waitFor(() => expect(removeSpy).toHaveBeenCalled());
  });
});
