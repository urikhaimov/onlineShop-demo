// src/utils/getCartTotal.ts
import { CartItem } from '../stores/useCartStore';

interface CartTotalOptions {
  shipping?: number;
  taxRate?: number; // e.g. 0.17 for 17%
  discount?: number; // in cents
}

export function getCartTotal(
  cart: CartItem[],
  { shipping = 0, taxRate = 0, discount = 0 }: CartTotalOptions = {},
): number {
  const subtotal = cart.reduce((sum, item) => {
    const price =
      typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + price * item.quantity;
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax + shipping - discount;

  return Math.max(Math.round(total * 100), 0); // cents, never below $0
}
