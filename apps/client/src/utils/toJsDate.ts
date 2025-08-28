export function toJsDate(val: unknown): Date | undefined {
  if (!val) return undefined;

  if (val instanceof Date) return isNaN(val.getTime()) ? undefined : val;

  if (typeof val === 'object' && val !== null) {
    type TimestampLike = {
      seconds?: number;
      nanoseconds?: number;
      toDate?: () => Date;
    };
    const objVal = val as TimestampLike;
    if (typeof objVal.seconds === 'number') {
      const ms =
        objVal.seconds * 1000 +
        Math.floor((objVal.nanoseconds ?? 0) / 1_000_000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof objVal.toDate === 'function') {
      const d = objVal.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : undefined;
    }
  }

  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}
