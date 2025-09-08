import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We'll import the store *after* enabling fake timers
let useCartStore: (typeof import('../../stores/useCartStore'))['useCartStore'];

// small helper so we don't repeat getState everywhere
const getStore = () => useCartStore.getState();

beforeEach(async () => {
  // 1) turn on fake timers *first*
  vi.useFakeTimers();
  // 2) set a stable base time; we'll jump forward later
  vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));

  // stub any globals your store might touch during reset/clear
  vi.stubGlobal('alert', vi.fn());

  // 3) ensure the module (and its setInterval) is created under fake timers
  vi.resetModules();
  ({ useCartStore } = await import('../../stores/useCartStore'));

  // clean persisted/session state
  sessionStorage.clear();

  // ensure a clean store state
  useCartStore.setState({ items: [], _persistedAt: Date.now() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useCartStore', () => {
  it('auto-clears after 1 hour of inactivity', () => {
    const { addToCart } = getStore();

    // add one item (this sets _persistedAt = Date.now())
    addToCart({ id: 'p2', name: 'Y', price: 50, stock: 10 } as any);

    // move the *system time* forward > 1h and tick the interval
    vi.setSystemTime(new Date(Date.now() + 61 * 60 * 1000));
    vi.advanceTimersByTime(61 * 60 * 1000);

    expect(getStore().items.length).toBe(0);
  });

  it('respects stock caps on updateQuantity', () => {
    const { addToCart, updateQuantity } = getStore();

    addToCart({ id: 'p1', name: 'X', price: 100, stock: 2 } as any);
    updateQuantity('p1', 10);

    expect(getStore().items.find((i) => i.id === 'p1')?.quantity).toBe(2);
  });

  it('computes totals with tax/shipping/discount', () => {
    const { addToCart, getCartTotal } = getStore();

    addToCart({ id: 'pA', name: 'A', price: 100, stock: 10 } as any);
    addToCart({
      id: 'pB',
      name: 'B',
      price: 50,
      stock: 10,
      quantity: 2,
    } as any);

    // subtotal = 100 + (50*2) = 200
    // total = subtotal + shipping(20) + tax(10%) - discount(5) = 200 + 20 + 20 - 5 = 235 -> 23500 cents
    expect(getCartTotal({ shipping: 20, taxRate: 0.1, discount: 5 })).toBe(
      23500,
    );
  });
});
