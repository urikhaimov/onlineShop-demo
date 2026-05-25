import type { GroupSortMode } from '../types';

/**
 * Groups by groupById (if provided) and sorts group order
 * either by count (desc) or alphabetically, then flattens to data rows.
 *
 * Tie-breaking: groups with equal count preserve their first-insertion order
 * (i.e., the order the first item of each group appeared in `data`).
 * This keeps category ordering stable when all groups have the same size.
 */
export function groupAndSortData<T extends object>(
  data: T[],
  groupById?: keyof T,
  mode: GroupSortMode = 'count',
): T[] {
  if (!groupById) return data;

  const map = new Map<string, T[]>();
  const insertionOrder = new Map<string, number>();

  for (const item of data) {
    const raw = (item as Record<string, unknown>)[String(groupById)];
    const key = String((raw ?? 'Unknown') as unknown);
    const arr = map.get(key);
    if (arr) {
      arr.push(item);
    } else {
      map.set(key, [item]);
      insertionOrder.set(key, insertionOrder.size);
    }
  }

  const keys = Array.from(map.keys());
  keys.sort((a, b) => {
    if (mode === 'count') {
      const diff = map.get(b)!.length - map.get(a)!.length;
      // Tie-break by first-seen order so equal-size groups stay stable
      return diff !== 0
        ? diff
        : insertionOrder.get(a)! - insertionOrder.get(b)!;
    }
    return a.localeCompare(b);
  });

  return keys.flatMap((k) => map.get(k)!);
}
