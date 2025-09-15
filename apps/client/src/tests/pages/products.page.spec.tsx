import * as React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from '../../pages/ProductsPage/ProductsPage'; // <-- adjust if your path differs

// ---------- shared state ----------
type Prod = {
  id: string;
  name: string;
  categoryId?: string;
  price?: number;
  stock?: number;
  metadata?: { updatedAt?: Date };
};
let mockProducts: Prod[] = [];
let inViewFlag = false;

// ---------- mocks (match EXACT imports used in ProductsPage) ----------
vi.mock('../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

vi.mock('../../hooks/useCategories', () => ({
  __esModule: true,
  useCategories: () => ({
    data: [
      { id: 'c1', name: 'Cat 1' },
      { id: 'c2', name: 'Cat 2' },
    ],
  }),
}));

vi.mock('../../hooks/useProductsQuery', () => ({
  __esModule: true,
  useProductsQuery: () => ({
    data: { items: mockProducts },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../stores/useProductStore', () => {
  const noop = () => {};
  return {
    __esModule: true,
    useProductStore: () => ({
      searchTerm: '',
      selectedCategoryId: '',
      updatedFrom: null,
      updatedTo: null,
      minPrice: 0,
      maxPrice: Number.MAX_SAFE_INTEGER,
      minStock: 0,
      maxStock: Number.MAX_SAFE_INTEGER,
      setSearchTerm: noop,
      setSelectedCategoryId: noop,
      setUpdatedFrom: noop,
      setUpdatedTo: noop,
      setMinPrice: noop,
      setMaxPrice: noop,
      setMinStock: noop,
      setMaxStock: noop,
      loading: false,
    }),
  };
});

vi.mock('react-intersection-observer', () => ({
  __esModule: true,
  useInView: () => ({ ref: vi.fn(), inView: inViewFlag }),
}));

vi.mock('@client/components/LoadingProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="loading">loading…</div>,
}));

vi.mock('../../components/InfiniteSentinel', () => ({
  __esModule: true,
  default: ({ hasMore }: any) => (
    <div data-testid="sentinel" data-has-more={hasMore} />
  ),
}));

vi.mock('react-i18next', () => ({
  __esModule: true,
  useTranslation: () => ({ t: (k: string, o?: any) => o?.defaultValue ?? k }),
}));

// PageLayout just pass-through to keep test minimal
vi.mock('../../layouts/page.layout', () => ({
  __esModule: true,
  PageLayout: ({ children }: any) => <>{children}</>,
  default: ({ children }: any) => <>{children}</>,
}));

// ---------- helper ----------
const renderSut = () =>
  render(
    <MemoryRouter initialEntries={['/products']}>
      <ThemeProvider theme={createTheme()}>
        <SnackbarProvider>
          <ProductsPage />
        </SnackbarProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

// ---------- test ----------
describe('ProductsPage — cards pagination', () => {
  beforeEach(() => {
    // make infinite bump instant in tests (your component reads this)
    (window as any).__INFINITE_DELAY__ = 0;
    inViewFlag = false;

    // 50 products so we can assert 20 -> 32
    mockProducts = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Prod ${i + 1}`,
      categoryId: i % 2 ? 'c1' : 'c2',
      price: i * 10,
      stock: i,
      metadata: {
        updatedAt: new Date(`2025-07-${String((i % 28) + 1).padStart(2, '0')}`),
      },
    }));
  });

  it('switches to cards view and paginates via intersection observer (20 -> +12)', async () => {
    const utils = renderSut();

    // Click the real TopActionBar button
    fireEvent.click(utils.getByTestId('view-cards'));
    await screen.findByTestId('cards-grid');

    // initial 20 visible
    await waitFor(() => {
      const grid = screen.getByTestId('cards-grid');
      expect(within(grid).getAllByText(/Prod \d+/).length).toBe(20);
    });

    // sentinel enters view -> visibleCount bumps immediately
    inViewFlag = true;
    renderSut(); // re-render so hook reads new inView

    await waitFor(() => {
      const grid = screen.getByTestId('cards-grid');
      expect(within(grid).getAllByText(/Prod \d+/).length).toBe(32);
    });

    expect(utils.getByTestId('sentinel').getAttribute('data-has-more')).toBe(
      'true',
    );
  });
});
