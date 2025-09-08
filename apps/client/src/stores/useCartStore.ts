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
  /** Programmatic full reset (used by logout/resetRegistry) */
  reset: () => void;
  hasItem: (id: string) => boolean;
  getCartTotal: (opts?: CartTotalOptions) => number;
  _persistedAt?: number;
};

const PERSIST_KEY = 'cart-storage';
const EXPIRATION_MS = 1000 * 60 * 60; // 1 hour

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      // Auto-expire items silently after 1h since last write
      if (typeof window !== 'undefined') {
        setInterval(() => {
          const savedAt = get()._persistedAt ?? 0;
          const now = Date.now();
          if (now - savedAt > EXPIRATION_MS && get().items.length > 0) {
            set({ items: [], _persistedAt: now });
            // console.log('🕒 Cart auto-cleared after 1 hour of inactivity');
          }
        }, 60_000);
      }

      const doReset = () => {
        set({ items: [], _persistedAt: Date.now() });
        try {
          sessionStorage.removeItem(PERSIST_KEY);
        } catch {
          /* noop */
        }
      };

      return {
        items: [],

        addToCart: (item) => {
          const now = Date.now();
          const existing = get().items.find((i) => i.id === item.id);
          if (existing) {
            set({
              items: get().items.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      quantity: Math.min(
                        i.quantity + (item.quantity ?? 1),
                        i.stock,
                      ),
                    }
                  : i,
              ),
              _persistedAt: now,
            });
          } else {
            set({
              items: [
                ...get().items,
                { ...item, quantity: item.quantity ?? 1 },
              ],
              _persistedAt: now,
            });
          }
        },

        removeFromCart: (id) => {
          set({
            items: get().items.filter((item) => item.id !== id),
            _persistedAt: Date.now(),
          });
        },

        updateQuantity: (id, quantity) => {
          set({
            items: get().items.map((item) =>
              item.id === id
                ? { ...item, quantity: Math.min(quantity, item.stock) }
                : item,
            ),
            _persistedAt: Date.now(),
          });
        },

        clearCart: () => {
          // optional UX signals—comment out if you don’t want them:
          // alert('🧹 Zustand clearCart triggered');
          // console.log('🛒 Cart cleared (Zustand + persist)');
          doReset();
        },

        // Full reset used by logout/resetRegistry
        reset: () => {
          doReset();
        },

        hasItem: (id) => get().items.some((item) => item.id === id),

        getCartTotal: ({
          shipping = 0,
          taxRate = 0,
          discount = 0,
        }: CartTotalOptions = {}) => {
          const subtotal = get().items.reduce((sum, item) => {
            const price =
              typeof item.price === 'string'
                ? parseFloat(item.price)
                : item.price;
            return sum + price * item.quantity;
          }, 0);

          const tax = subtotal * taxRate;
          const total = subtotal + shipping + tax - discount;

          // return in cents (rounded, non-negative)
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
        const expired = now - savedAt > EXPIRATION_MS;

        if (expired) {
          // console.log('🕒 Cart expired during sessionStorage migration');
          return { items: [], _persistedAt: now } as Partial<CartState>;
        }

        return persistedState as CartState;
      },
      // Avoid persisting functions; only `items` and `_persistedAt` are stored by JSONStorage.
      partialize: (state) => ({
        items: state.items,
        _persistedAt: state._persistedAt,
      }),
    },
  ),
);

// Register this store's reset so AuthProvider can clear it on logout
registerStoreReset(() => useCartStore.getState().reset());

// Optional helper
export const useCartCount = () =>
  useCartStore((state) => state.items.reduce((sum, i) => sum + i.quantity, 0));
