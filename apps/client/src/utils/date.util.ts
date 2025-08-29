// src/utils/date.util.ts (or extend your existing columns.util)
export function asDateLoose(v: unknown): Date | undefined {
  if (!v) return undefined;

  // Firestore Timestamp objects (client/admin)
  if (typeof v === 'object') {
    const anyV = v as any;

    // Timestamp instance (has toDate)
    if (typeof anyV.toDate === 'function') {
      const d = anyV.toDate();
      return isNaN(d.getTime()) ? undefined : d;
    }

    // POJO from JSON: seconds/nanoseconds OR _seconds/_nanoseconds
    const secs =
      typeof anyV.seconds === 'number'
        ? anyV.seconds
        : typeof anyV._seconds === 'number'
          ? anyV._seconds
          : undefined;

    if (typeof secs === 'number') {
      const nanos =
        typeof anyV.nanoseconds === 'number'
          ? anyV.nanoseconds
          : typeof anyV._nanoseconds === 'number'
            ? anyV._nanoseconds
            : 0;
      const ms = secs * 1000 + Math.floor(nanos / 1e6);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? undefined : d;
    }
  }

  // Epoch ms or sec
  if (typeof v === 'number') {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // ISO string
  if (typeof v === 'string') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}
