// apps/client-e2e/src/helpers/data.ts
// Test data factories — generate unique, deterministic test data.

let _seq = 0;
const seq = () => ++_seq;

export function makeProduct(overrides?: Record<string, unknown>) {
  const n = seq();
  return {
    id: `prod-${n}`,
    name: `Test Product ${n}`,
    price: 10 + n,
    stock: 100,
    images: ['/placeholder.png'],
    description: `Description for product ${n}.`,
    categoryId: 'cat-001',
    slug: `test-product-${n}`,
    ...overrides,
  };
}

export function makeCategory(overrides?: Record<string, unknown>) {
  const n = seq();
  return {
    id: `cat-${n}`,
    name: `Category ${n}`,
    description: `Description for category ${n}.`,
    slug: `category-${n}`,
    ...overrides,
  };
}

export function makeOrder(overrides?: Record<string, unknown>) {
  const n = seq();
  return {
    id: `ord-${n}`,
    status: 'pending',
    totalAmount: 49.99,
    items: [{ productId: 'prod-001', quantity: 1, price: 49.99 }],
    createdAt: new Date().toISOString(),
    userId: 'u_test',
    ...overrides,
  };
}

export function makeUser(overrides?: Record<string, unknown>) {
  const n = seq();
  return {
    id: `user-${n}`,
    email: `user${n}@example.com`,
    role: 'user',
    displayName: `User ${n}`,
    ...overrides,
  };
}

// Checkout form data (uses Hebrew/Israeli test values matching existing tests)
export const CHECKOUT_FORM = {
  ownerName: 'Uri Test',
  passportId: 'A1234567',
  shippingFullName: 'Uri Test',
  shippingPhone: '0501234567',
  shippingStreet: 'Test Street 10',
  shippingCity: 'Tel Aviv',
  shippingPostalCode: '6100000',
  shippingCountry: 'IL',
} as const;
