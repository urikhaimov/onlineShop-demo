// src/utils/exportOrdersToCsv.ts
import type { TOrder } from '@common/types';

type OrderItem = { price?: number | null; quantity?: number | null };

function computeTotal(
  o: Partial<TOrder> & {
    items?: OrderItem[] | null;
    total?: number | null;
    amount?: number | null;
  },
) {
  if (typeof o.amount === 'number') return o.amount;
  if (typeof o.total === 'number') return o.total;
  const items = Array.isArray(o.items) ? o.items : [];
  return items.reduce((sum, it) => {
    const p = Number(it?.price ?? 0);
    const q = Number(it?.quantity ?? 0);
    return sum + (Number.isFinite(p) && Number.isFinite(q) ? p * q : 0);
  }, 0);
}

function extractEmail(o: any): string {
  return o?.user?.email ?? o?.email ?? o?.customer?.email ?? '';
}

function csvEscape(v: unknown) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadOrdersCsv(
  rows: TOrder[],
  filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`,
) {
  const headers = [
    'id',
    'status',
    'email',
    'total',
    'itemsCount',
    'createdAt',
    'updatedAt',
  ];

  const lines = rows.map((o) => {
    const total = computeTotal(o as any);
    const itemsCount = Array.isArray(o.items) ? o.items.length : 0;
    return [
      o.id,
      (o as any).status ?? '',
      extractEmail(o),
      total,
      itemsCount,
      (o as any).createdAt ?? '',
      (o as any).updatedAt ?? '',
    ]
      .map(csvEscape)
      .join(',');
  });

  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
