import { Timestamp } from 'firebase/firestore';

export function asDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;

  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  if (typeof value === 'object') {
    const v = value as Timestamp & { [k: string]: unknown };

    if (typeof v.toDate === 'function') {
      const d = v.toDate?.();
      return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
    }

    if ('seconds' in v && typeof (v as Timestamp).seconds === 'number') {
      const secs = (v as any).seconds as number;
      const nanos = (v as any).nanoseconds as number | undefined;
      const d = new Date(secs * 1000 + Math.floor((nanos ?? 0) / 1_000_000));
      return isNaN(d.getTime()) ? undefined : d;
    }
  }

  return undefined;
}
