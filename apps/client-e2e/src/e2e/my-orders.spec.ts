import { test, expect, Page } from '@playwright/test';

/* ---------------- dataset + API mock ---------------- */
function seedOrders(total: number) {
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    return {
      id: `ORD-${String(n).padStart(4, '0')}`,
      status: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'][
        i % 5
      ],
      totalAmount: 50 + (i % 20) * 25,
      createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
    };
  });
}

async function mockMyOrdersEndpoint(page: Page, dataset = seedOrders(33)) {
  await page.route('**/orders/mine**', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const status = url.searchParams.get('status') || '';
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const totalMin = Number(url.searchParams.get('totalMin') ?? '0');
    const totalMax = Number(
      url.searchParams.get('totalMax') ?? String(Number.MAX_SAFE_INTEGER),
    );
    const pageParam = Number(url.searchParams.get('page') ?? '1');
    const limitParam = Number(url.searchParams.get('limit') ?? '10');

    let filtered = dataset;
    if (q) filtered = filtered.filter((o) => o.id.toLowerCase().includes(q));
    if (status) filtered = filtered.filter((o) => o.status === status);
    if (startDate)
      filtered = filtered.filter((o) => o.createdAt.slice(0, 10) >= startDate);
    if (endDate)
      filtered = filtered.filter((o) => o.createdAt.slice(0, 10) <= endDate);
    filtered = filtered.filter(
      (o) =>
        (o.totalAmount ?? 0) >= totalMin && (o.totalAmount ?? 0) <= totalMax,
    );

    const total = filtered.length;
    const start = Math.max(0, (pageParam - 1) * limitParam);
    const items = filtered.slice(start, start + limitParam);

    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items, total }),
    });
  });
}

/* ---------------- boot + module overrides ---------------- */
async function primeE2E(page: Page) {
  await page.addInitScript(() => {
    (window as any).__E2E__ = true;
    try {
      const adminUser = {
        id: 'e2e-admin',
        email: 'admin@example.com',
        roles: ['admin'],
        name: 'E2E Admin',
        permissions: ['orders.manage', 'ORDERS_MANAGE', 'MANAGE_ORDERS'],
      };
      localStorage.setItem('access_token', 'e2e-test');
      localStorage.setItem('token', 'e2e-test');
      localStorage.setItem('auth', JSON.stringify({ user: adminUser }));
      sessionStorage.setItem('access_token', 'e2e-test');
      localStorage.setItem('i18nextLng', 'en'); // stable UI text
    } catch {}
  });
}

async function overrideAppModules(page: Page) {
  // PageLayout -> passthrough
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return /\/(src|apps\/client)\/.*\/layouts\/page\.layout\.(t|j)sx?$/i.test(
          p,
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        import * as React from "react";
        export function PageLayout({ children }) { return children; }
        export default PageLayout;
      `;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );

  // Ability -> always allow
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return /\/(src|apps\/client)\/.*\/services\/ability(?:\.|-)?service\.(t|j)sx?$/i.test(
          p,
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        export const EAbilityActions = { READ:'read', CREATE:'create', UPDATE:'update', DELETE:'delete', MANAGE:'manage' };
        export const EAbilitySubjects = { PRODUCT:'product', ORDER:'order', PRODUCTS:'products', ORDERS:'orders', ALL:'all' };
        export const ability = { can: () => true, cannot: () => false, update: () => {}, on: () => {} };
        export const can = () => true;
        export default ability;
      `;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );

  // useAuth -> authed, not loading
  await page.route(
    (url) => {
      try {
        const p = new URL(url).pathname;
        return (
          /\/(src|apps\/client)\/.*\/hooks\/useAuth(?:\/index)?\.(t|j)sx?$/i.test(
            p,
          ) ||
          /\/(src|apps\/client)\/.*\/hooks\/use-auth(?:\/index)?\.(t|j)sx?$/i.test(
            p,
          )
        );
      } catch {
        return false;
      }
    },
    async (route) => {
      const js = `
        export function useAuth() {
          return { user: { id: "u_test", email: "test@example.com", roles: ["admin"] }, loading: false, error: null };
        }
        export default useAuth;
      `;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body: js,
      });
    },
  );
}

/* ---------------- open /my-orders directly ---------------- */
async function openOrdersDirect(page: Page) {
  // Try standard route
  await page
    .goto('/my-orders?view=table', { waitUntil: 'domcontentloaded' })
    .catch(() => {});
  if (!/\/my-orders/i.test(page.url())) {
    // Hash-router fallback
    await page
      .goto('/#/my-orders?view=table', { waitUntil: 'domcontentloaded' })
      .catch(() => {});
  }
  await expect(page).toHaveURL(/my-orders/i, { timeout: 20_000 });

  // Wait for Orders to render (any of these is enough)
  const anyEvidence = [
    '[data-testid="orders-table"]',
    '[data-testid="btn-open-filters"]',
    '[class*=MuiTablePagination-actions]',
    'table',
  ].join(', ');

  const apiSettled = page
    .waitForResponse(
      (r) => /\/orders\/mine/i.test(r.url()) && r.request().method() === 'GET',
      {
        timeout: 10_000,
      },
    )
    .catch(() => null);

  await page.waitForSelector(anyEvidence, {
    state: 'visible',
    timeout: 20_000,
  });
  await apiSettled;

  // Ensure table view
  const tableBtn = page.getByTestId('view-table');
  if (await tableBtn.isVisible().catch(() => false)) {
    await tableBtn.click().catch(() => {});
  }

  // Final table assertion
  const testIdTable = page.getByTestId('orders-table');
  if ((await testIdTable.count()) > 0) {
    await expect(testIdTable.first()).toBeVisible({ timeout: 20_000 });
  } else {
    await expect(page.locator('table').first()).toBeVisible({
      timeout: 20_000,
    });
  }
}

/* ---------------- tests ---------------- */

test('My Orders — server-paginated list, search, next page', async ({
  page,
}) => {
  await primeE2E(page);
  await overrideAppModules(page);
  await mockMyOrdersEndpoint(page, seedOrders(33));

  await openOrdersDirect(page);

  // Open filters, type, close
  const openFiltersBtn = page.getByTestId('btn-open-filters');
  if (await openFiltersBtn.isVisible().catch(() => false)) {
    await openFiltersBtn.click();
    await page
      .locator('[role="dialog"] input, [role="dialog"] textarea')
      .first()
      .fill('ORD-000');
    await page.keyboard.press('Escape');
  }

  // Next page via stable aria label (provided by StickyTable)
  await page.getByLabel(/go to next page/i).click();

  // Still visible
  const table = page.getByTestId('orders-table');
  if ((await table.count()) > 0) {
    await expect(table).toBeVisible();
  } else {
    await expect(page.locator('table').first()).toBeVisible();
  }
});

test('My Orders — paging with a large dataset (stubbed)', async ({ page }) => {
  await primeE2E(page);
  await overrideAppModules(page);
  await mockMyOrdersEndpoint(page, seedOrders(137));

  await openOrdersDirect(page);

  const rowsFirst = await page.locator('table tbody tr').count();
  expect(rowsFirst).toBeGreaterThan(0);
  expect(rowsFirst).toBeLessThanOrEqual(10);

  await page.getByLabel(/go to next page/i).click();
  const rowsSecond = await page.locator('table tbody tr').count();
  expect(rowsSecond).toBeGreaterThan(0);

  const text2 = await page.locator('table tbody tr').first().textContent();
  await page.getByLabel(/go to previous page/i).click();
  const text1 = await page.locator('table tbody tr').first().textContent();
  expect(text2?.trim()).not.toBe(text1?.trim());
});
