// payments.util.ts
export type CartItem = { id: string; price: number; quantity: number }; // price in major units (₪), not cents

const toMinor = (v: number) => Math.round(v * 100);

export function calcAmountMinor(items: CartItem[], shipping = 0): number {
  const itemsMinor = items.reduce(
    (sum, it) => sum + toMinor(it.price) * (it.quantity ?? 1),
    0,
  );
  return itemsMinor + toMinor(shipping ?? 0);
}
