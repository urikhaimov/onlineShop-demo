export function toJsDate(val: unknown): Date | undefined {
  if (!val) return undefined;

  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;

  if (typeof val === 'object' && val !== null) {
    const anyVal = val as any;
    if (typeof anyVal.seconds === 'number') {
      const ms =
        anyVal.seconds * 1000 +
        Math.floor((anyVal.nanoseconds ?? 0) / 1_000_000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof anyVal.toDate === 'function') {
      const d = anyVal.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
    }
  }

  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}
