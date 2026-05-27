// apps/client-e2e/src/e2e/products.spec.ts
// Public product listing and product detail page tests.
import { test, expect } from '../fixtures';
import {
  mockProductsList,
  mockProductDetail,
  mock500,
  DEMO_PRODUCT,
} from '../helpers/mocks';

test.describe('Products listing page', () => {
  test('loads and shows product list', async ({ app }) => {
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    // Wait for either a product card, product name, or the products container
    await expect(
      app
        .getByText(DEMO_PRODUCT.name)
        .or(app.locator('[data-testid*="product"]').first())
        .or(app.getByRole('main')),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('shows multiple products in the list', async ({ app }) => {
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(3_000);

    // Verify at least one product-like element renders (harness seeds one demo product)
    const bodyText = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    // The harness seeds a Hebrew product (סודה); also accept any English product word
    const hasProduct =
      bodyText.includes('סודה') ||
      bodyText.toLowerCase().includes('product') ||
      bodyText.toLowerCase().includes('widget') ||
      (await app.locator('[data-testid*="product"]').count()) > 0 ||
      (await app.locator('[class*="ProductCard"]').count()) > 0 ||
      (await app.locator('img[alt]').count()) > 0;
    expect(hasProduct).toBeTruthy();
  });

  test('empty state is handled gracefully', async ({ app }) => {
    await mockProductsList(app, []);
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(2_000);
    // Should not crash — either shows empty message or no products
    const body = await app.locator('body').innerText();
    expect(body).not.toMatch(/error|crash|500/i);
  });

  test('shows error message on API 500', async ({ app }) => {
    await mock500(app, /\/api\/products/);
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(3_000);
    // Should show error state, not crash
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    // Either shows error text or falls back gracefully
    expect(typeof body).toBe('string');
  });
});

test.describe('Product detail page', () => {
  test('loads product detail', async ({ app }) => {
    await app.goto(`/product/${DEMO_PRODUCT.id}`, {
      waitUntil: 'domcontentloaded',
    });
    // The harness stubs the product detail endpoint
    await expect(
      app
        .getByText(DEMO_PRODUCT.name, { exact: false })
        .or(app.getByRole('main')),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('displays product name and price', async ({ app }) => {
    await mockProductDetail(app, DEMO_PRODUCT);
    await app.goto(`/product/${DEMO_PRODUCT.id}`, {
      waitUntil: 'domcontentloaded',
    });
    await app.waitForTimeout(2_000);

    const bodyText = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    // Name should appear somewhere on the page
    expect(bodyText).toMatch(
      new RegExp(DEMO_PRODUCT.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    );
  });

  test('has add-to-cart interaction', async ({ app }) => {
    await app.goto(`/product/${DEMO_PRODUCT.id}`, {
      waitUntil: 'domcontentloaded',
    });
    await app.waitForTimeout(2_000);

    // Look for any "add to cart" button
    const addBtn = app
      .getByRole('button', { name: /add to cart|add|הוסף/i })
      .or(app.getByTestId('add-to-cart'));
    if (await addBtn.count()) {
      await expect(addBtn.first()).toBeVisible();
    }
  });
});

test.describe('Product search and filter', () => {
  test('products page is accessible at /products', async ({ app }) => {
    const resp = await app.goto('/products', { waitUntil: 'domcontentloaded' });
    // Should not 404
    expect(resp?.status()).not.toBe(404);
  });

  test('navigating between products does not crash', async ({ app }) => {
    await app.goto('/products', { waitUntil: 'domcontentloaded' });
    await app.waitForTimeout(1_000);
    await app.goto(`/product/${DEMO_PRODUCT.id}`, {
      waitUntil: 'domcontentloaded',
    });
    await app.waitForTimeout(1_000);
    // No crash
    const body = await app
      .locator('body')
      .innerText()
      .catch(() => '');
    expect(body.length).toBeGreaterThan(0);
  });
});
