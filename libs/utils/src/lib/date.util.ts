// libs/utils/src/lib/date.util.ts
export type FirestoreLike =
  | Date
  | string
  | number
  | { toDate?: () => Date }
  | {
      seconds?: number;
      nanoseconds?: number;
      _seconds?: number;
      _nanoseconds?: number;
    }
  | null
  | undefined;

export function asDateLoose(v: FirestoreLike): Date | null {
  if (!v) return null;

  // Date
  if (v instanceof Date) return isNaN(+v) ? null : v;

  // ISO string or epoch millis
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }
  if (typeof v === 'number') {
    const d = new Date(v);
    return isNaN(+d) ? null : d;
  }

  // Firestore Timestamp
  const anyV = v as any;
  if (typeof anyV?.toDate === 'function') {
    try {
      const d = anyV.toDate();
      return d instanceof Date && !isNaN(+d) ? d : null;
    } catch {
      /* ignore */
    }
  }

  // POJO with seconds/nanoseconds or _seconds/_nanoseconds
  const sec = typeof anyV?.seconds === 'number' ? anyV.seconds : anyV?._seconds;
  const nano =
    typeof anyV?.nanoseconds === 'number'
      ? anyV.nanoseconds
      : (anyV?._nanoseconds ?? 0);

  if (typeof sec === 'number') {
    const ms = sec * 1000 + Math.floor((Number(nano) || 0) / 1e6);
    const d = new Date(ms);
    return isNaN(+d) ? null : d;
  }

  return null;
}
