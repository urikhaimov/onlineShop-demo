// libs/mailer/src/templates/subjects.ts
export function subjectFor(tpl: string, brand: string, data: any) {
  switch (tpl) {
    case 'order-update':
      return `${brand} · ${data?.statusLabel || data?.status || 'Update'}`;
    case 'payment-receipt':
      return `${brand} · Receipt · #${data?.orderId || ''}`.trim();
    case 'order-confirmed':
      return `${brand} · Order #${data?.orderId || ''} confirmed`.trim();
    case 'refund':
      return `${brand} · Refund · #${data?.orderId || ''}`.trim();
    default:
      return `${brand} · Update`;
  }
}
