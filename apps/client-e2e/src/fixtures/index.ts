// apps/client-e2e/src/fixtures/index.ts
// Playwright custom fixtures that wrap the common harness setup.
// Import `test` and `expect` from this file instead of @playwright/test.
import { test as base, expect, type Page } from '@playwright/test';
import { installHarness } from '../e2e/_harness';

// ─── Fixture types ───────────────────────────────────────────────────────────

type AppFixtures = {
  /** Page with full harness: auth bypass + all API stubs + cart seeded */
  app: Page;
  /** Page with harness but cart cleared (for cart/checkout tests) */
  emptyCart: Page;
  /** Page with harness, admin role seeded (same as app — already admin) */
  admin: Page;
};

// ─── Extended test ───────────────────────────────────────────────────────────

export const test = base.extend<AppFixtures>({
  // Full harness — most tests use this
  app: async ({ page }, use) => {
    await installHarness(page);
    await use(page);
  },

  // Harness with an empty cart (override localStorage after harness seeds)
  emptyCart: async ({ page }, use) => {
    await installHarness(page);
    await page.addInitScript(() => {
      try {
        const empty = JSON.stringify({
          state: { items: [], count: 0, subtotal: 0 },
          version: 0,
        });
        localStorage.removeItem('cart');
        localStorage.removeItem('cartItems');
        localStorage.setItem('useCartStore', empty);
        localStorage.setItem('cart-store', empty);
        localStorage.setItem('use-cart-store', empty);
      } catch {
        // ignore
      }
    });
    await use(page);
  },

  // Admin fixture — same as app, admin role already injected by harness
  admin: async ({ page }, use) => {
    await installHarness(page);
    await use(page);
  },
});

export { expect };
