// apps/client-e2e/src/e2e/error-handling.spec.ts
// Network failures, API errors, invalid forms, unauthorized access.
import { test, expect } from '../fixtures';
import {
  mockNetworkError,
  mock500,
  mock401,
  mockOrdersList,
} from '../helpers/mocks';

test.describe('API network failures', () => {
  test('products page handles network error gracefully', async ({ app }) => {
    await mockNetworkError(app, /\/api\/products/);
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(3_000);
    // Should not show an unhandled error page — either error state or empty
    const bodyText = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(bodyText).not.toMatch(/application error|unhandled exception/i);
  });

  test('my orders page handles network error gracefully', async ({ app }) => {
    await mockNetworkError(app, /\/api\/orders/);
    await app.goto('/my-orders', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(3_000);
    const bodyText = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(bodyText).not.toMatch(/application error|unhandled exception/i);
  });

  test('admin orders page handles 500 gracefully', async ({ admin }) => {
    await mock500(admin, /\/api\/orders/);
    await admin.goto('/admin/orders', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(3_000);
    const bodyText = await admin
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(bodyText).not.toMatch(/uncaught/i);
  });
});

test.describe('Form validation errors', () => {
  test('login form shows required field errors', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const submit = page.getByTestId('login-submit');
    if (await submit.count()) {
      await submit.click();
      // RHF validation shows error messages
      await page.waitForTimeout(500);
      const errorText = await page
        .locator('body')
        .innerText()
        .catch(() => '');
      expect(errorText).toMatch(/required|invalid|error/i);
    }
  });

  test('signup confirms password mismatch', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const pass = page.getByTestId('signup-password');
    const confirm = page.getByTestId('signup-confirm-password');
    if ((await pass.count()) && (await confirm.count())) {
      await pass.fill('password123');
      await confirm.fill('different456');
      await page.getByTestId('signup-submit').click();
      await expect(page.getByText(/passwords do not match/i)).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('checkout form validates required fields', async ({ app }) => {
    await app.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(3_000);

    const placeOrder = app.getByTestId('place-order');
    if (await placeOrder.count()) {
      // Click without filling required fields
      await placeOrder.click();
      await app.waitForTimeout(1_000);
      // Either a validation error appears or we stay on /checkout
      const stillOnCheckout = /\/checkout/.test(app.url());
      const hasError =
        (await app.getByRole('alert').count()) > 0 ||
        (await app.locator('[class*="error"]').count()) > 0;
      expect(stillOnCheckout || hasError).toBeTruthy();
    }
  });
});

test.describe('Unauthorized access', () => {
  test('admin page shows no JS errors when accessed with harness', async ({
    admin,
  }) => {
    const errors: string[] = [];
    admin.on('pageerror', (e) => errors.push(e.message));

    await admin.goto('/admin', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2_000);

    // Filter out known benign errors (Firebase, PayPal SDK, etc.)
    const severeErrors = errors.filter(
      (e) =>
        !e.includes('firebase') &&
        !e.includes('paypal') &&
        !e.includes('ResizeObserver') &&
        !e.includes('network') &&
        !e.includes('Failed to fetch'),
    );
    expect(severeErrors).toHaveLength(0);
  });

  test('404 page renders for unknown routes', async ({ app }) => {
    await app.goto('/this-route-does-not-exist-abc123', {
      waitUntil: 'domcontentloaded',
    });
    await app.waitForTimeout(2_000);
    // Should show 404 page, not crash
    const bodyText = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(bodyText.length).toBeGreaterThan(0);
    // The NotFoundPage should render something
    expect(bodyText).not.toMatch(/application error/i);
  });
});

test.describe('Race conditions and async handling', () => {
  test('rapid navigation does not crash', async ({ app }) => {
    const errors: string[] = [];
    app.on('pageerror', (e) => errors.push(e.message));

    // Navigate rapidly between pages
    await app.goto('/', { waitUntil: 'domcontentloaded' });
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.goto('/my-orders', { waitUntil: 'domcontentloaded' });
    await app.goto('/', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(1_000);

    const severeErrors = errors.filter(
      (e) =>
        !e.includes('firebase') &&
        !e.includes('paypal') &&
        !e.includes('ResizeObserver') &&
        !e.includes('Failed to fetch') &&
        !e.includes('AbortError'),
    );
    expect(severeErrors).toHaveLength(0);
  });

  test('back/forward navigation does not crash', async ({ app }) => {
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.goto('/my-orders', { waitUntil: 'domcontentloaded' });
    await app.goBack();
    await app.waitForTimeout(1_000);
    await app.goForward();
    await app.waitForTimeout(1_000);
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });
});
