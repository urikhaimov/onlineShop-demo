// utils/http.ts
export function cleanParams<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      v !== 'undefined' &&
      v !== 'null'
    ) {
      out[k] = v;
    }
  }
  return out as T;
}
