import type { GroupSortMode } from '../types';

/**
 * Groups by groupById (if provided) and sorts group order
 * either by count or alphabetically, then flattens to data rows.
 */
export function groupAndSortData<T extends object>(
  data: T[],
  groupById?: keyof T,
  mode: GroupSortMode = 'count',
): T[] {
  if (!groupById) return data;

  const map = new Map<string, T[]>();
  for (const item of data) {
    const raw = (item as Record<string, unknown>)[String(groupById)];
    const key = String((raw ?? 'Unknown') as unknown);
    const arr = map.get(key);
    if (arr) arr.push(item);
    else map.set(key, [item]);
  }

  const keys = Array.from(map.keys());
  keys.sort((a, b) => {
    if (mode === 'count') return map.get(b)!.length - map.get(a)!.length;
    return a.localeCompare(b);
  });

  return keys.flatMap((k) => map.get(k)!);
}
