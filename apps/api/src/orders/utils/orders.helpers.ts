export type OrderStatus = 'open' | 'paid' | 'refunded' | 'canceled';

export const nowIso = () => new Date().toISOString();

export function defined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function stripUndefinedDeep<T = any>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((v) => stripUndefinedDeep(v))
      .filter((v) => v !== undefined) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, any>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]);
    return Object.fromEntries(entries) as unknown as T;
  }
  return value;
}

export const toMinor = (v: unknown) =>
  Math.max(0, Math.round((Number(v) || 0) * 100));
export const normalizeRate = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n <= 1 ? n : n / 100; // accepts 0.17 or 17 → 0.17
};
