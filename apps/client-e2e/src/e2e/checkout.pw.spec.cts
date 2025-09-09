// apps/client-e2e/src/e2e/checkout.pw.spec.cts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // --- Fixtures ---
  const demoProducts = [
    {
      id: 'p_demo_1',
      slug: 'demo-product',
      name: 'Demo Product',
      price: 49.99,
      stock: 7, // ✅ ensure enabled "Add to Cart"
      images: ['/placeholder.png'],
      description: 'Test item',
      categoryId: 'cat_demo',
    },
  ];

  // Boot settings
  await page.route('**/api/theme/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        theme: 'light',
        currency: 'ILS',
        locale: 'he-IL',
        features: { checkout: true },
      }),
    });
  });

  // Products list (public / with query)
  await page.route(/\/api\/.*products(\/public)?(\?.*)?$/i, async (route) => {
    const url = route.request().url();
    if (/\/api\/products\/(public\/)?[^/?]+$/i.test(url))
      return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: demoProducts,
        data: demoProducts,
        products: demoProducts,
      }),
    });
  });

  // Product details
  await page.route(/\/api\/products\/(public\/)?[^/?]+$/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoProducts[0]),
    });
  });

  // PaymentIntent
  await page.route('**/api/**/create*intent*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ clientSecret: 'pi_secret_test_123' }),
    });
  });

  // Orders create
  await page.route('**/api/orders**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ord_test_001',
          status: 'confirmed',
          total: 49.99,
          items: [{ productId: 'p_demo_1', qty: 1 }],
        }),
      });
      return;
    }
    await route.continue();
  });

  // Catch-all
  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"ok":true}',
    });
  });

  // Mock Stripe (before app script runs)
  await page.addInitScript(() => {
    (window as any).Stripe = () => ({
      elements: () => ({
        create: () => ({ mount: () => {}, destroy: () => {} }),
      }),
      confirmCardPayment: async () => ({
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      }),
    });
  });
});

test('happy path checkout (Stripe + backend stubbed)', async ({ page }) => {
  await page.goto('/');

  // ✅ Optional login (skip if not present / localized)
  const loginBtn = page
    .getByRole('button', { name: /login|log in|sign in|התחברות|כניסה/i })
    .first();
  if (await loginBtn.count()) {
    await loginBtn.click();
    const email = page.getByLabel(/email|דוא\"ל|אימייל/i);
    const password = page.getByLabel(/password|סיסמה/i);
    if (await email.count()) await email.fill('user@test.com');
    if (await password.count()) await password.fill('password123');
    const submit = page
      .getByRole('button', { name: /sign in|login|כניסה|התחברות/i })
      .first();
    if (await submit.count()) await submit.click();
    await page.waitForLoadState('networkidle');
  }

  await page.waitForLoadState('networkidle');

  // 🔎 Robust "Add to cart" lookup
  async function findAddToCart() {
    const a = page
      .locator('[data-test="add-to-cart"], [data-testid="add-to-cart"]')
      .first();
    if (await a.count()) return a;
    const b = page
      .getByRole('button', { name: /add to cart|הוסף לסל/i })
      .first();
    if (await b.count()) return b;
    const c = page
      .locator('button[id*="add"], button[class*="add"][class*="cart"]')
      .first();
    if (await c.count()) return c;
    return null;
  }

  let addToCart = await findAddToCart();

  // 🔁 PDP direct navigation fallback (catalog may be gated on auth)
  if (!addToCart) {
    const candidates = [
      '/product/demo-product',
      '/products/demo-product',
      '/product/p_demo_1',
      '/products/p_demo_1',
    ];
    for (const url of candidates) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      addToCart = await findAddToCart();
      if (addToCart) break;
    }
  }

  // 🧩 As a last resort, click a product card then re-scan
  if (!addToCart) {
    const productCard = page
      .locator('[data-test="product-card"], [data-testid="product-card"]')
      .first()
      .or(page.locator('a[href*="/product"], a[href*="/products/"]').first());
    if (await productCard.count()) {
      await productCard.click();
      await page.waitForLoadState('networkidle');
      addToCart = await findAddToCart();
    }
  }

  expect(addToCart, 'Could not find an Add to cart button').not.toBeNull();
  await expect(addToCart!).toBeVisible({ timeout: 20_000 });
  await addToCart!.click();

  // Checkout (with resilient fallbacks)
  const openCart = page
    .getByTestId('open-cart')
    .or(page.getByRole('button', { name: /cart|עגלה/i }).first());
  await openCart.click();

  const checkoutBtn = page
    .getByTestId('checkout')
    .or(page.getByRole('button', { name: /checkout|לתשלום|קופה/i }).first());
  await checkoutBtn.click();

  // Shipping
  await page.getByLabel(/full name|name|שם מלא/i).fill('אורי חיימוב');
  await page.getByLabel(/address|street|כתובת/i).fill('רחוב הרצל 10');
  await page.getByLabel(/city|עיר/i).fill('רמת גן');
  const zip = page.getByLabel(/zip|postal|מיקוד/i);
  if (await zip.count()) await zip.fill('5251234');
  await page.getByLabel(/phone|טלפון/i).fill('0501234567');
  const email = page.getByLabel(/email|דוא\"ל|אימייל/i);
  if (await email.count()) await email.fill('uri@example.com');

  // Pay
  const placeOrder = page
    .getByTestId('place-order')
    .or(page.getByRole('button', { name: /pay|place order|complete|לתשלום/i }));
  await placeOrder.click();

  // Success & cart cleared
  await expect(
    page
      .getByTestId('order-success')
      .or(
        page.getByText(
          /thank you|order confirmed|payment succeeded|תודה|הזמנה אומתה/i,
        ),
      ),
  ).toBeVisible({ timeout: 20_000 });

  const cartCount = page.getByTestId('cart-count');
  if (await cartCount.count()) await expect(cartCount).toHaveText(/0/);
});
