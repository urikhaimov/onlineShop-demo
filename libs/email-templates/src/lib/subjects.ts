// Keep the full map so it's easy to extend later
export const Subjects = {
  // core
  orderConfirmed: {
    en: 'Your order {{orderId}} is confirmed',
    he: 'ההזמנה {{orderId}} אושרה',
  },
  paymentReceipt: {
    en: 'Your receipt for order {{orderId}}',
    he: 'קבלה להזמנה {{orderId}}',
  },
  passwordReset: {
    en: 'Reset your password',
    he: 'איפוס סיסמה',
  },

  // statuses
  orderShipped: {
    en: 'Your order {{orderId}} has shipped',
    he: 'ההזמנה {{orderId}} נשלחה',
  },
  orderDelivered: {
    en: 'Your order {{orderId}} was delivered',
    he: 'ההזמנה {{orderId}} נמסרה',
  },
  orderCanceled: {
    en: 'Your order {{orderId}} was canceled',
    he: 'ההזמנה {{orderId}} בוטלה',
  },

  // optional (already handy if you add templates later)
  orderOpen: {
    en: 'Order {{orderId}} opened',
    he: 'הזמנה {{orderId}} נפתחה',
  },
  orderAuthorized: {
    en: 'Order {{orderId}} authorized for capture',
    he: 'הזמנה {{orderId}} אושרה לתפיסה',
  },
  orderPaid: {
    en: 'Payment received for order {{orderId}}',
    he: 'התשלום עבור הזמנה {{orderId}} התקבל',
  },
  orderRefunded: {
    en: 'Refund issued for order {{orderId}}',
    he: 'הונפק החזר עבור הזמנה {{orderId}}',
  },
} as const;

type Lang = 'en' | 'he';

/** simple mustache-style templating */
function tpl(str: string, vars: Record<string, any> = {}) {
  return String(str).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, k) => {
    const v = vars[k.trim()];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** map template filename → key in Subjects */
function keyFromTemplateName(name: string): keyof typeof Subjects | null {
  const n = name.toLowerCase().replace(/\.(mjml|html)$/, '');

  // underscore + hyphen variants
  if (/(^|\/)order[_-]confirmed$/.test(n)) return 'orderConfirmed';
  if (/(^|\/)payment[_-]receipt$/.test(n)) return 'paymentReceipt';
  if (/(^|\/)password[_-]reset$/.test(n)) return 'passwordReset';

  if (
    /(^|\/)order[_-]shipped$/.test(n) ||
    /order[_-]update[_-]shipped$/.test(n)
  )
    return 'orderShipped';
  if (
    /(^|\/)order[_-]delivered$/.test(n) ||
    /order[_-]update[_-]delivered$/.test(n)
  )
    return 'orderDelivered';
  if (
    /(^|\/)order[_-]canceled$/.test(n) ||
    /order[_-]update[_-]canceled$/.test(n)
  )
    return 'orderCanceled';

  // optional ones if you ever create them
  if (/order[_-]open$/.test(n) || /order[_-]update[_-]open$/.test(n))
    return 'orderOpen';
  if (
    /order[_-]authorized$/.test(n) ||
    /order[_-]update[_-]authorized$/.test(n)
  )
    return 'orderAuthorized';
  if (/order[_-]paid$/.test(n) || /order[_-]update[_-]paid$/.test(n))
    return 'orderPaid';
  if (/order[_-]refunded$/.test(n) || /order[_-]update[_-]refunded$/.test(n))
    return 'orderRefunded';

  return null;
}

/** Public API used by the mailer (already autodetected in your service) */
export function subjectFor(
  templateName: string,
  locale: string | undefined,
  vars: Record<string, any> = {},
): string {
  const lang: Lang = (locale || process.env['MAIL_LOCALE'] || 'he')
    .toLowerCase()
    .startsWith('he')
    ? 'he'
    : 'en';
  const key = keyFromTemplateName(templateName);
  if (key) return tpl(Subjects[key][lang], vars);

  // generic fallback
  const generic = {
    en: 'Order {{orderId}} updated',
    he: 'הזמנה {{orderId}} עודכנה',
  } as const;
  return tpl(generic[lang], vars);
}
