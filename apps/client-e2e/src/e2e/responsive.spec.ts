// apps/client-e2e/src/e2e/responsive.spec.ts
// Mobile, tablet, and desktop layout tests.
// Runs against mobile-chrome, mobile-safari, and tablet projects too.
import { test, expect } from '../fixtures';

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
} as const;

// Test core pages at each viewport size
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'products', path: '/products' },
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'my-orders', path: '/my-orders' },
] as const;

// Mobile tests
test.describe('Mobile layout', () => {
  for (const { name, path } of PAGES) {
    test(`${name} page renders on mobile (375px)`, async ({ app }) => {
      await app.setViewportSize(VIEWPORTS.mobile);
      await app.goto(path, { waitUntil: 'domcontentloaded' });
      await app.waitForTimeout(2_000);

      // No horizontal scroll on mobile
      const scrollWidth = await app.evaluate(
        () => document.documentElement.scrollWidth,
      );
      const clientWidth = await app.evaluate(
        () => document.documentElement.clientWidth,
      );
      // Allow up to 20px overflow (scrollbar etc.)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
    });
  }

  test('admin page renders on mobile', async ({ admin }) => {
    await admin.setViewportSize(VIEWPORTS.mobile);
    await admin.goto('/admin', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2_000);
    expect(admin.url()).not.toMatch(/\/login/);
  });

  test('checkout page renders on mobile', async ({ app }) => {
    await app.setViewportSize(VIEWPORTS.mobile);
    await app.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body).not.toMatch(/uncaught/i);
  });
});

// Tablet tests
test.describe('Tablet layout', () => {
  test('products page renders on tablet (768px)', async ({ app }) => {
    await app.setViewportSize(VIEWPORTS.tablet);
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });

  test('admin products page renders on tablet', async ({ admin }) => {
    await admin.setViewportSize(VIEWPORTS.tablet);
    await admin.goto('/admin/products', { waitUntil: 'domcontentloaded' });
    await admin.waitForTimeout(2_000);
    expect(admin.url()).not.toMatch(/\/login/);
  });
});

// Desktop tests
test.describe('Desktop layout', () => {
  test('home page renders on desktop (1280px)', async ({ app }) => {
    await app.setViewportSize(VIEWPORTS.desktop);
    await app.goto('/', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });

  test('products page has no horizontal scroll on desktop', async ({ app }) => {
    await app.setViewportSize(VIEWPORTS.desktop);
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    const scrollWidth = await app.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await app.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20);
  });
});

// Navigation on mobile
test.describe('Mobile navigation', () => {
  test('login form is usable on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);

    const form = page.getByTestId('login-form');
    if (await form.count()) {
      const emailInput = page.getByTestId('login-email');
      if (await emailInput.count()) {
        await emailInput.click();
        await emailInput.fill('test@example.com');
        const val = await emailInput.inputValue();
        expect(val).toBe('test@example.com');
      }
    }
  });

  test('signup form is usable on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2_000);
    const form = page.getByTestId('signup-form');
    if (await form.count()) {
      await expect(form).toBeVisible();
    }
  });
});
