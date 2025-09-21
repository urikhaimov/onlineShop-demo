// src/stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IProduct } from '@common/types';
import { registerStoreReset } from '../state/resetRegistry';

export type CartItem = IProduct & { quantity: number };

interface CartTotalOptions {
  shipping?: number;
  taxRate?: number;
  discount?: number;
}

type CartState = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  reset: () => void;
  hasItem: (id: string) => boolean;
  getCartTotal: (opts?: CartTotalOptions) => number;
  _persistedAt?: number;
};

const PERSIST_KEY = 'cart-storage';
const EXPIRATION_MS = 1000 * 60 * 60;

// ── helpers ────────────────────────────────────────────────────────────────
const toNum = (v: unknown, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const toPosInt = (v: unknown, fb = 1) => {
  const n = Math.trunc(toNum(v, fb));
  return n > 0 ? n : fb;
};
const safeStock = (stock?: unknown) => {
  const n = Number(stock);
  return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
};
const clampToStock = (qty: number, stock?: unknown) =>
  Math.min(qty, safeStock(stock));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      if (typeof window !== 'undefined') {
        setInterval(() => {
          const savedAt = get()._persistedAt ?? 0;
          if (Date.now() - savedAt > EXPIRATION_MS && get().items.length > 0) {
            set({ items: [], _persistedAt: Date.now() });
          }
        }, 60_000);
      }

      const doReset = () => {
        set({ items: [], _persistedAt: Date.now() });
        try {
          sessionStorage.removeItem(PERSIST_KEY);
        } catch {
          // ignore
        }
      };

      return {
        items: [],

        addToCart: (item) => {
          const now = Date.now();
          const inc = toPosInt(item.quantity ?? 1, 1);
          set((state) => {
            const existing = state.items.find((i) => i.id === item.id);
            if (existing) {
              const nextQty = clampToStock(
                toPosInt(existing.quantity, 1) + inc,
                existing.stock,
              );
              return {
                items: state.items.map((i) =>
                  i.id === item.id ? { ...i, quantity: nextQty } : i,
                ),
                _persistedAt: now,
              };
            }
            return {
              items: [
                ...state.items,
                {
                  ...(item as any),
                  quantity: clampToStock(inc, (item as any).stock),
                },
              ],
              _persistedAt: now,
            };
          });
        },

        removeFromCart: (id) => {
          set({
            items: get().items.filter((item) => item.id !== id),
            _persistedAt: Date.now(),
          });
        },

        updateQuantity: (id, quantity) => {
          const q = clampToStock(
            toPosInt(quantity, 1),
            get().items.find((i) => i.id === id)?.stock,
          );
          set({
            items: get().items.map((item) =>
              item.id === id ? { ...item, quantity: q } : item,
            ),
            _persistedAt: Date.now(),
          });
        },

        clearCart: () => doReset(),
        reset: () => doReset(),
        hasItem: (id) => get().items.some((item) => item.id === id),

        getCartTotal: ({
          shipping = 0,
          taxRate = 0,
          discount = 0,
        }: CartTotalOptions = {}) => {
          const subtotal = get().items.reduce((sum, item) => {
            const price = toNum(item.price, 0);
            const qty = toPosInt(item.quantity, 1);
            return sum + price * qty;
          }, 0);
          const tax = subtotal * toNum(taxRate, 0);
          const total =
            subtotal + toNum(shipping, 0) + tax - toNum(discount, 0);
          return Math.max(Math.round(total * 100), 0);
        },
      };
    },
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      migrate: (persistedState, _version) => {
        const now = Date.now();
        const savedAt = (persistedState as CartState)._persistedAt ?? 0;
        if (now - savedAt > EXPIRATION_MS) {
          return { items: [], _persistedAt: now } as Partial<CartState>;
        }
        return persistedState as CartState;
      },
      partialize: (state) => ({
        items: state.items,
        _persistedAt: state._persistedAt,
      }),
    },
  ),
);

// Reset hook
registerStoreReset(() => useCartStore.getState().reset());

// Safe cart count (never NaN)
export const useCartCount = () =>
  useCartStore((state) =>
    state.items.reduce((sum, i) => sum + toPosInt(i.quantity, 1), 0),
  );
