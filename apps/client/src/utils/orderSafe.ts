import type { TOrder } from '@common/types';
import { asDate, DASH } from '../utils/columns.util';

export type OrderItem = Partial<{
  productId: string;
  name: string;
  price: number; // MAJOR
  quantity: number;
}>;

export const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;

export const strProp = (o: unknown, k: string): string | undefined => {
  if (!isRecord(o)) return undefined;
  const v = o[k];
  return typeof v === 'string' && v.trim() ? v : undefined;
};

export const numProp = (o: unknown, k: string): number | undefined => {
  if (!isRecord(o)) return undefined;
  return typeof o[k] === 'number' ? (o[k] as number) : undefined;
};

export const recProp = (
  o: unknown,
  k: string,
): Record<string, unknown> | undefined =>
  isRecord(o) && isRecord(o[k]) ? (o[k] as Record<string, unknown>) : undefined;

export const coalesce = (...xs: ReadonlyArray<unknown>): string => {
  for (const x of xs) if (typeof x === 'string' && x.trim()) return x.trim();
  return DASH;
};

export function extractCustomer(
  order: TOrder,
): { name?: string; email?: string; phone?: string } | undefined {
  const r = order as unknown as Record<string, unknown>;
  const c = r.customer;
  if (!isRecord(c)) return undefined;
  return {
    name: strProp(c, 'name'),
    email: strProp(c, 'email'),
    phone: strProp(c, 'phone'),
  };
}

export const itemsFromOrder = (order: TOrder): ReadonlyArray<OrderItem> =>
  Array.isArray((order as unknown as Record<string, unknown>).items)
    ? ((order as unknown as Record<string, unknown>).items as OrderItem[])
    : [];

export const amountMinorToMajor = (minor?: number): number | undefined =>
  typeof minor === 'number' ? minor / 100 : undefined;

export const keyForItem = (it: OrderItem, idx: number) => {
  const pid = typeof it.productId === 'string' ? it.productId : 'no-id';
  const nm = typeof it.name === 'string' ? it.name : 'noname';
  return `${pid}::${nm}::${idx}`;
};

export const createdDate = (order: TOrder) => {
  const r = order as unknown as Record<string, unknown>;
  const meta = recProp(r, 'metadata');
  return asDate((r['createdAt'] ?? meta?.['createdAt']) as any);
};

export const updatedDate = (order: TOrder) => {
  const r = order as unknown as Record<string, unknown>;
  const meta = recProp(r, 'metadata');
  return asDate((r['updatedAt'] ?? meta?.['updatedAt']) as any);
};
