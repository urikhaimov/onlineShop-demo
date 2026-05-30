// apps/client-e2e/src/helpers/mocks.ts
// Composable API mock helpers. These extend what the harness already sets up,
// letting individual tests override specific endpoints cleanly.
import type { Page, Route } from '@playwright/test';

const isSameOrigin = (u: string) => {
  try {
    return new URL(u).origin.startsWith('http://127.0.0.1');
  } catch {
    return false;
  }
};

// ─── Generic helpers ─────────────────────────────────────────────────────────

export function mockGet(
  page: Page,
  pathPattern: RegExp,
  body: unknown,
  status = 200,
) {
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return pathPattern.test(new URL(url).pathname);
    },
    (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      return route.fulfill({
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
    },
  );
}

export function mockPost(
  page: Page,
  pathPattern: RegExp,
  body: unknown,
  status = 200,
) {
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return pathPattern.test(new URL(url).pathname);
    },
    (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      return route.fulfill({
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
    },
  );
}

export function mockNetworkError(page: Page, pathPattern: RegExp) {
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return pathPattern.test(new URL(url).pathname);
    },
    (route) => route.abort('failed'),
  );
}

export function mock500(
  page: Page,
  pathPattern: RegExp,
  message = 'Internal Server Error',
) {
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return pathPattern.test(new URL(url).pathname);
    },
    (route) =>
      route.fulfill({
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ message, statusCode: 500 }),
      }),
  );
}

export function mock401(page: Page, pathPattern: RegExp) {
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return pathPattern.test(new URL(url).pathname);
    },
    (route) =>
      route.fulfill({
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ message: 'Unauthorized', statusCode: 401 }),
      }),
  );
}

// ─── Domain-specific mocks ───────────────────────────────────────────────────

export const DEMO_PRODUCT = {
  id: 'prod-001',
  name: 'Test Product',
  price: 29.99,
  stock: 50,
  images: ['/placeholder.png'],
  description: 'A product for testing.',
  categoryId: 'cat-001',
  slug: 'test-product',
};

export const DEMO_CATEGORY = {
  id: 'cat-001',
  name: 'Test Category',
  description: 'Category for testing.',
  slug: 'test-category',
};

export const DEMO_ORDER = {
  id: 'ord-001',
  status: 'pending',
  totalAmount: 29.99,
  items: [{ productId: 'prod-001', quantity: 1, price: 29.99 }],
  createdAt: new Date().toISOString(),
  userId: 'u_test',
};

export const DEMO_USER = {
  id: 'u_001',
  email: 'user@example.com',
  role: 'user',
  displayName: 'Test User',
};

export function mockProductsList(page: Page, products = [DEMO_PRODUCT]) {
  return mockGet(page, /\/api\/products(\/public)?$/, {
    items: products,
    data: products,
    total: products.length,
    ok: true,
  });
}

export function mockProductDetail(page: Page, product = DEMO_PRODUCT) {
  return mockGet(page, new RegExp(`/api/products/${product.id}`), {
    ...product,
    item: product,
    ok: true,
  });
}

export function mockOrdersList(page: Page, orders = [DEMO_ORDER]) {
  return mockGet(page, /\/api\/orders(\/mine)?/, {
    items: orders,
    total: orders.length,
    ok: true,
  });
}

export function mockCategoriesList(page: Page, categories = [DEMO_CATEGORY]) {
  return mockGet(page, /\/api\/categories/, {
    items: categories,
    data: categories,
    ok: true,
  });
}

export function mockUsersList(page: Page, users = [DEMO_USER]) {
  return mockGet(page, /\/api\/users/, {
    items: users,
    data: users,
    ok: true,
  });
}

export function mockPayPalCapture(
  page: Page,
  status: 'COMPLETED' | 'DECLINED' = 'COMPLETED',
) {
  if (status === 'DECLINED') {
    return page.route(
      (url) => {
        if (!isSameOrigin(url.toString())) return false;
        return /\/capture-?paypal-?order/i.test(new URL(url).pathname);
      },
      (route) =>
        route.fulfill({
          status: 422,
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            message: 'Payment declined by PayPal.',
            statusCode: 422,
          }),
        }),
    );
  }
  return page.route(
    (url) => {
      if (!isSameOrigin(url.toString())) return false;
      return /\/capture-?paypal-?order/i.test(new URL(url).pathname);
    },
    (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          ok: true,
          status: 'COMPLETED',
          orderId: 'ord_test_001',
        }),
      }),
  );
}
