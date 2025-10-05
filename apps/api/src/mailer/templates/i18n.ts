// libs/mailer/src/templates/i18n.ts
type Dict = Record<string, any>;
const safeGet = (obj: any, pathStr: string) =>
  String(pathStr)
    .split('.')
    .reduce<any>(
      (a, k) => (a && typeof a === 'object' ? a[k] : undefined),
      obj,
    );

let EN: Dict = {},
  HE: Dict = {};
try {
  EN = require('../../../i18n/en/common.json');
} catch {
  // ignore
}
try {
  HE = require('../../../i18n/he/common.json');
} catch {
  // ignore
}

export function t(
  locale: string | undefined,
  key: string,
  vars?: Record<string, any>,
  fallback?: string,
) {
  const dict = (locale || '').toLowerCase().startsWith('he')
    ? Object.keys(HE).length
      ? HE
      : EN
    : Object.keys(EN).length
      ? EN
      : HE;
  const val = safeGet(dict, key) as string | undefined;
  const src = val ?? (safeGet(EN, key) as string | undefined) ?? fallback ?? '';
  return (src || '').replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, k) => {
    const v = vars?.[k.trim()];
    return v === undefined || v === null ? '' : String(v);
  });
}
