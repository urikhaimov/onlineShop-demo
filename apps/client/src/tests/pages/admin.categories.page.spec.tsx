import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';

// ── Passthrough layout
vi.mock('../../layouts/page.layout', () => ({
  PageLayout: ({ children }: any) => <>{children}</>,
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

// i18n passthrough
vi.mock('../../i18n', () => ({}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_k: string, o?: any) => o?.defaultValue ?? o ?? _k,
  }),
  Trans: ({ children }: any) => (
    <>{typeof children === 'function' ? children('') : children}</>
  ),
  __esModule: true,
}));

// Categories query hook
type Category = { id: string; name: string };
let mockCats: Category[] = [];
const refetchSpy = vi.fn();
vi.mock('../../hooks/useCategories', () => ({
  useCategories: () => ({
    data: mockCats,
    refetch: refetchSpy,
  }),
  __esModule: true,
}));

// URL ↔ table sync hooks: no-ops
vi.mock('../../hooks/useStickyTableQuerySync', () => ({
  useStickyTableQuerySync: () => {
    return;
  },
  __esModule: true,
}));

// Category table store — stable snapshot via useSyncExternalStore
vi.mock('../../stores/useCategoryTableStore', () => {
  const React = require('react');

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const state = {
    sorting: [] as any[],
    columnFilters: [] as any[],
  };

  let snapshotCache: any = null;
  const buildSnapshot = () => ({
    sorting: state.sorting,
    columnFilters: state.columnFilters,
    setSorting: (updater: any) => {
      state.sorting =
        typeof updater === 'function' ? updater(state.sorting) : updater;
      snapshotCache = buildSnapshot();
      notify();
    },
    setColumnFilters: (updater: any) => {
      state.columnFilters =
        typeof updater === 'function' ? updater(state.columnFilters) : updater;
      snapshotCache = buildSnapshot();
      notify();
    },
  });
  const getSnapshot = () => (snapshotCache ??= buildSnapshot());
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    __esModule: true,
    useCategoryTableStore: () =>
      (React as typeof import('react')).useSyncExternalStore(
        subscribe,
        getSnapshot,
        getSnapshot,
      ),
    __test__: { state, setState: (patch: any) => Object.assign(state, patch) },
  };
});

// Capture delete action coming from columns
let columnsDeleteHook: ((c: Category) => void) | null = null;
vi.mock('../../pages/admin/AdminCategoriesPage/Columns', () => ({
  defineCategoryColumns: (_nav: any, openDelete: any) => {
    columnsDeleteHook = openDelete;
    return [{ header: 'Name', accessorKey: 'name' }];
  },
  __esModule: true,
}));

// Minimal StickyTable that renders items & exposes delete buttons per row
vi.mock('../../components/StickyTable', () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <ul data-testid="grid">
        {props.data?.map((c: Category) => (
          <li key={c.id}>
            <span>{c.name}</span>{' '}
            <button
              aria-label={`delete-${c.id}`}
              onClick={() => columnsDeleteHook?.(c)}
            >
              del
            </button>
          </li>
        ))}
      </ul>
    </div>
  ),
}));

// Firebase module with db+storage placeholders (imported by the page)
vi.mock('../../firebase', () => ({
  db: { __tag: 'db' },
  storage: { __tag: 'storage' },
  __esModule: true,
}));

// Firestore functions that the page uses
const getDocsMock = vi.fn();
const writeBatchMock = vi.fn();
const batchDeleteMock = vi.fn();
const batchCommitMock = vi.fn();
const deleteDocMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (_db: any, _col: string, id: string) => ({ __doc: true, id }),
  deleteDoc: (...args: any[]) => deleteDocMock(...args),
  collection: (_db: any, _c: string) => ({ __coll: true }),
  query: (...args: any[]) => args, // passthrough
  where: (...args: any[]) => ({ __where: args }),
  getDocs: (...args: any[]) => getDocsMock(...args),
  writeBatch: (_db: any) => {
    writeBatchMock(_db);
    return {
      delete: (...args: any[]) => batchDeleteMock(...args),
      commit: (...args: any[]) => batchCommitMock(...args),
    };
  },
  limit: (n: number) => ({ __limit: n }),
  __esModule: true,
}));

// Storage delete
const deleteObjectMock = vi.fn();
vi.mock('firebase/storage', () => ({
  ref: (_storage: any, url: string) => ({ __ref: url }),
  deleteObject: (...args: any[]) => deleteObjectMock(...args),
  __esModule: true,
}));

// AdminHeaderBar — simple header with Add button
vi.mock('../../components/AdminHeaderBar', () => ({
  __esModule: true,
  default: ({ title, rightActions }: any) => (
    <div>
      <h1>{title || 'Manage Categories'}</h1>
      <div data-testid="right-actions">{rightActions}</div>
    </div>
  ),
}));

// 🔁 Mock useNavigate so we can assert navigation (and avoid route warnings)
const navigateMock = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const real = await orig();
  return Object.assign({}, real, { useNavigate: () => navigateMock });
});

// SUT import helper (correct relative path)
async function renderSut(route = '/admin/categories') {
  const { default: AdminCategoriesPage } = await import(
    '../../pages/admin/AdminCategoriesPage/AdminCategoriesPage'
  );
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider>
          <Routes>
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          </Routes>
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    mockCats = [
      { id: 'c1', name: 'Cat 1' },
      { id: 'c2', name: 'Cat 2' },
    ];
    refetchSpy.mockReset();
    navigateMock.mockReset();

    // Firestore batch + getDocs mocks reset
    getDocsMock.mockReset();
    writeBatchMock.mockReset();
    batchDeleteMock.mockReset();
    batchCommitMock.mockReset();
    deleteDocMock.mockReset();
    deleteObjectMock.mockReset();

    // Default: First getDocs call returns 2 products belonging to c1; second returns empty
    let call = 0;
    getDocsMock.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        const docs = [
          {
            id: 'p1',
            ref: { __docRef: true, id: 'p1' },
            data: () => ({
              images: ['gs://bucket/a.jpg', 'https://.../b.png'],
            }),
          },
          {
            id: 'p2',
            ref: { __docRef: true, id: 'p2' },
            data: () => ({ images: [] }),
          },
        ];
        return Promise.resolve({ empty: false, size: docs.length, docs });
      }
      return Promise.resolve({ empty: true, size: 0, docs: [] });
    });

    batchCommitMock.mockResolvedValue(undefined);
    deleteDocMock.mockResolvedValue(undefined);
    deleteObjectMock.mockResolvedValue(undefined);
  });

  it('renders categories and Add Category navigates to /admin/categories/add', async () => {
    const u = user.setup();
    await renderSut();

    const list = await screen.findByTestId('grid');
    expect(within(list).getAllByText(/Cat \d/).length).toBe(2);

    const add = screen.getByRole('button', { name: /add category/i });
    await u.click(add);
    expect(navigateMock).toHaveBeenCalledWith('/admin/categories/add');
  });

  it('opens delete dialog and confirms -> cascades product deletes, images, then category', async () => {
    const u = user.setup();
    await renderSut();

    // Open delete for first category
    await u.click(screen.getByRole('button', { name: 'delete-c1' }));

    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/delete category\?/i)).toBeInTheDocument();

    // Confirm delete
    const confirm =
      within(dlg).queryByRole('button', { name: /delete/i }) ||
      within(dlg).getByText(/delete/i);
    await u.click(confirm!);

    // Expect: images deleted, batched product deletes committed, final category delete, and refetch called
    await waitFor(() => {
      expect(deleteObjectMock).toHaveBeenCalled(); // at least one image
      expect(batchDeleteMock).toHaveBeenCalled(); // product doc deletes queued
      expect(batchCommitMock).toHaveBeenCalledTimes(1); // one non-empty batch
      expect(deleteDocMock).toHaveBeenCalledTimes(1); // category doc delete
      expect(refetchSpy).toHaveBeenCalled(); // categories refreshed
    });
  });

  it('handles empty categories (renders empty grid)', async () => {
    mockCats = [];
    await renderSut();
    const list = await screen.findByTestId('grid');
    // no <li> children
    expect(list.querySelectorAll('li').length).toBe(0);
  });

  it('deletes products in multiple batches until empty', async () => {
    // Override the default batching: two non-empty batches, then empty
    let call = 0;
    getDocsMock.mockImplementation(() => {
      call += 1;
      if (call <= 2) {
        const docs = Array.from({ length: 3 }).map((_, i) => ({
          id: `p${call}-${i}`,
          ref: { __docRef: true, id: `p${call}-${i}` },
          data: () => ({ images: [] }),
        }));
        return Promise.resolve({ empty: false, size: docs.length, docs });
      }
      return Promise.resolve({ empty: true, size: 0, docs: [] });
    });

    const u = user.setup();
    await renderSut();
    await u.click(screen.getByRole('button', { name: 'delete-c1' }));
    const dlg = await screen.findByRole('dialog');
    const confirm =
      within(dlg).queryByRole('button', { name: /delete/i }) ||
      within(dlg).getByText(/delete/i);
    await u.click(confirm!);

    await waitFor(() => {
      expect(batchCommitMock).toHaveBeenCalledTimes(2); // two batches committed
      expect(deleteDocMock).toHaveBeenCalledTimes(1); // category deleted
    });
  });

  it('continues deletion even if an image delete fails (best-effort storage cleanup)', async () => {
    deleteObjectMock.mockRejectedValueOnce(new Error('missing'));
    const u = user.setup();
    await renderSut();
    await u.click(screen.getByRole('button', { name: 'delete-c1' }));
    const dlg = await screen.findByRole('dialog');
    const confirm =
      within(dlg).queryByRole('button', { name: /delete/i }) ||
      within(dlg).getByText(/delete/i);
    await u.click(confirm!);

    await waitFor(() => {
      expect(deleteDocMock).toHaveBeenCalledTimes(1); // category still deleted
      expect(batchCommitMock).toHaveBeenCalledTimes(1);
    });
  });
});
