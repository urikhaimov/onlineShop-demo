// apps/api/src/orders/utils/payment.util.ts
import { ZERO_DEC } from './currency.util';

export type InputPayment =
  | {
      method?: string;
      status?: 'paid' | 'unpaid' | string;
      transactionId?: string | null;
    }
  | undefined;

export function toPlainPayment(p?: InputPayment) {
  if (!p) {
    return {
      method: 'manual' as const,
      status: 'paid' as const,
      transactionId: `manual-${Date.now()}`,
    };
  }
  const status = (p.status === 'paid' ? 'paid' : 'unpaid') as 'paid' | 'unpaid';
  return {
    method: String(p.method ?? 'card'),
    status,
    transactionId: p.transactionId ?? null,
  };
}

/** Minimum amounts in MINOR units (e.g., cents/agorot) by currency */
export const MIN_MINOR_BY_CURRENCY: Record<string, number> = {
  usd: 50,
  eur: 50,
  gbp: 30,
  ils: 200, // PayPal minimum for ILS (₪2.00)
  aud: 50,
  cad: 50,
  chf: 50,
  sek: 50,
  dkk: 50,
  nok: 50,
  jpy: 50,
  huf: 175,
  idr: 10000,
  krw: 500,
  vnd: 12000,
};

/** Clamp a MINOR amount up to the minimum for the given currency */
export function clampMinorForCurrency(minor: number, currency: string): number {
  const cur = (currency || 'usd').toLowerCase();
  const n = Math.max(0, Math.round(Number(minor) || 0));
  const min = MIN_MINOR_BY_CURRENCY[cur] ?? 50;
  return n < min ? min : n;
}

/** Convert MINOR → MAJOR, respecting zero-decimal currencies */
export function minorToMajor(minor: number, currency: string): number {
  return ZERO_DEC.has((currency || 'USD').toUpperCase())
    ? Math.round(Number(minor) || 0)
    : (Number(minor) || 0) / 100;
}

/** Convert MAJOR → MINOR, respecting zero-decimal currencies */
export function majorToMinor(major: number, currency: string): number {
  return ZERO_DEC.has((currency || 'USD').toUpperCase())
    ? Math.round(Number(major) || 0)
    : Math.round((Number(major) || 0) * 100);
}
