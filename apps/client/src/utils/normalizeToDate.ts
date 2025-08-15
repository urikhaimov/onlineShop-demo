// src/utils/normalizeToDate.ts
import { Timestamp } from 'firebase/firestore';

type FirestoreTsLike = { seconds: number; nanoseconds: number };

export function normalizeToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();

  // Plain Firestore timestamp-like object
  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in (value as any) &&
    'nanoseconds' in (value as any)
  ) {
    const v = value as FirestoreTsLike;
    return new Date(v.seconds * 1000 + Math.floor(v.nanoseconds / 1_000_000));
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
