import { render, screen, waitFor, within } from '@testing-library/react';
import user from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ---- simplify layout/auth/theme/i18n so the page can render quickly ----
vi.mock('../../layouts/page.layout', () => ({
  PageLayout: ({ children }: any) => <>{children}</>,
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u', roles: ['admin'] }, loading: false }),
  __esModule: true,
}));

vi.mock('../../stores/useThemeStore', () => ({
  useThemeStore: () => ({ themeSettings: {} }),
  __esModule: true,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, o?: any) => o?.defaultValue ?? k,
    i18n: {
      language: 'en',
      resolvedLanguage: 'en',
      changeLanguage: async () => {},
    },
  }),
  Trans: ({ children }: any) => (
    <>{typeof children === 'function' ? children('') : children}</>
  ),
  initReactI18next: { type: '3rdParty', init: () => {} },
  __esModule: true,
}));

vi.mock('../../pages/MyOrdersPage/Columns', () => ({
  useOrderColumns: () => [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Status', accessorKey: 'status' },
    { header: 'Total', accessorKey: 'totalAmount' },
  ],
  __esModule: true,
}));

// ---- make retry/backoff immediate ----
vi.mock('../../utils/retryWithBackoff', () => ({
  retryWithBackoff: async (fn: any) => fn(),
  __esModule: true,
}));

// ---- DATA + AXIOS MOCK (covers whatever the page calls under axiosInstance) ----
type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

const { axiosGetSpy } = vi.hoisted(() => ({ axiosGetSpy: vi.fn() }));

function seedOrders(total: number): Order[] {
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return {
      id: `ORD-${String(n).padStart(4, '0')}`,
      status: ['pending', 'confirmed'][i % 2],
      totalAmount: 10 + (i % 7),
      createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
    };
  });
}

function mockServer(total: number) {
  const ds = seedOrders(total);
  axiosGetSpy.mockImplementation(async (url: string, config?: any) => {
    // Support a couple likely URLs
    if (!/orders/i.test(url)) {
      return { status: 200, data: { items: [], total: 0 } };
    }

    const params = config?.params ?? {};
    let filtered = [...ds];

    const q = params.q ?? params.search ?? params.query;
    const status = params.status;
    const startDate = params.startDate ?? params.from;
    const endDate = params.endDate ?? params.to;
    const totalMin = params.totalMin ?? params.minTotal;
    const totalMax = params.totalMax ?? params.maxTotal;

    if (q)
      filtered = filtered.filter((o) =>
        o.id.toLowerCase().includes(String(q).toLowerCase()),
      );
    if (status) filtered = filtered.filter((o) => o.status === status);
    if (startDate)
      filtered = filtered.filter((o) => o.createdAt.slice(0, 10) >= startDate);
    if (endDate)
      filtered = filtered.filter((o) => o.createdAt.slice(0, 10) <= endDate);
    if (totalMin !== null && totalMin !== undefined)
      filtered = filtered.filter(
        (o) => (o.totalAmount ?? 0) >= Number(totalMin),
      );
    if (totalMax !== null && totalMax !== undefined)
      filtered = filtered.filter(
        (o) => (o.totalAmount ?? 0) <= Number(totalMax),
      );

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 10));
    const start = (page - 1) * limit;

    return Promise.resolve({
      status: 200,
      data: {
        items: filtered.slice(start, start + limit),
        total: filtered.length,
      },
    });
  });
}

// The page likely imports axiosInstance from here.
vi.mock('../../api/axiosInstance', () => ({
  default: {
    get: (...args: any[]) => axiosGetSpy(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  __esModule: true,
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function renderMyOrders(initial = '/my-orders?view=table') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { default: MyOrdersPage } = await import('../../pages/MyOrdersPage');

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/my-orders" element={<MyOrdersPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('MyOrdersPage — renders first page and goes next (server pagination)', async () => {
  mockServer(33);
  const u = user.setup();
  await renderMyOrders('/my-orders?view=table');

  // wait for first fetch to occur and loader to disappear
  await waitFor(() => expect(axiosGetSpy).toHaveBeenCalled());
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument(),
  );

  // Use a forgiving matcher: some table libs split text nodes
  const first = await screen.findByText((content) => /ORD-0001/.test(content));
  expect(first).toBeInTheDocument();

  // go to next page (try several common labels)
  const nextBtn =
    screen.queryByLabelText(/go to next page/i) ||
    screen.queryByRole('button', { name: /next/i }) ||
    screen.getByRole('button', { name: /›|»/ });

  await u.click(nextBtn!);

  // server called with page 2 (or equivalent param)
  await waitFor(() => {
    const lastCall = axiosGetSpy.mock.calls.at(-1) as any;
    const params = lastCall?.[1]?.params ?? {};
    expect(Number(params.page ?? 1)).toBe(2);
  });

  const secondPageCell = await screen.findByText((c) => /ORD-0011/.test(c));
  expect(secondPageCell).toBeInTheDocument();
});

test('MyOrdersPage — search filter reduces visible rows', async () => {
  mockServer(20);
  const u = user.setup();
  await renderMyOrders('/my-orders?view=table');

  await waitFor(() => expect(axiosGetSpy).toHaveBeenCalled());
  await waitFor(() =>
    expect(
      screen.queryByRole('status', { name: /loading/i }),
    ).not.toBeInTheDocument(),
  );

  // open filters (TopActionBar button or generic "Filter")
  const openBtn =
    screen.queryByTestId('btn-open-filters') ||
    screen.queryByRole('button', { name: /filter/i }) ||
    screen.getByRole('button', { name: /search/i });
  await u.click(openBtn!);

  const dialog = await screen.findByRole('dialog');

  // pick the first textbox for "Order ID contains"
  const textbox =
    within(dialog).queryByRole('textbox', { name: /order id/i }) ||
    within(dialog).getAllByRole('textbox')[0];

  await u.clear(textbox!);
  await u.type(textbox!, 'ORD-0005');
  // close if this is a drawer
  const closeBtn =
    within(dialog).queryByRole('button', { name: /apply|close|done/i }) ??
    within(dialog).queryByLabelText(/close/i);
  if (closeBtn) await u.click(closeBtn);

  // server should be refetched with our query
  await waitFor(() => {
    const lastCall = axiosGetSpy.mock.calls.at(-1) as any;
    const params = lastCall?.[1]?.params ?? {};
    const q = String(params.q ?? params.search ?? params.query ?? '');
    expect(q).toMatch(/ORD-0005/);
  });

  const row = await screen.findByText((c) => /ORD-0005/.test(c));
  expect(row).toBeInTheDocument();
});
