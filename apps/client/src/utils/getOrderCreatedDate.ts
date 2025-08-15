// src/utils/getOrderCreatedDate.ts
import { normalizeToDate } from './normalizeToDate';
import type { TOrder } from '@common/types';

type MaybeCreated =
  | {
      createdAt?: unknown;
      created_at?: unknown;
      createdOn?: unknown;
      date?: unknown;
    }
  | undefined;

export function getOrderCreatedDate(order: TOrder): Date | null {
  // primary (your shared type)
  const primary = order.metadata?.createdAt;
  const fromPrimary = normalizeToDate(primary);
  if (fromPrimary) return fromPrimary;

  // defensive: support legacy/alt fields without changing TOrder
  const o = order as unknown as MaybeCreated & {
    metadata?: { created_at?: unknown };
  };

  const candidates = [
    o?.createdAt,
    o?.created_at,
    o?.createdOn,
    o?.date,
    o?.metadata?.created_at, // some backends store snake_case
  ];

  for (const v of candidates) {
    const d = normalizeToDate(v);
    if (d) return d;
  }

  return null;
}
