import * as fs from 'fs';
import * as path from 'path';
import mjml2html from 'mjml';
import Handlebars, { type TemplateDelegate } from 'handlebars';

type RenderOut = { html: string; text: string };

const TEMPLATE_DIRS = [
  process.env.MAIL_TPL_DIR || '',
  path.join(process.cwd(), 'libs', 'email-templates', 'src', 'templates'), // dev
  path.join(process.cwd(), 'dist', 'libs', 'email-templates', 'templates'), // prod (nx)
  path.join(__dirname, 'templates'), // local fallback
  __dirname,
].filter(Boolean);

function stripHtml(html: string) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find a template by name (prefers .he/.en), across search roots */
function findTemplate(
  name: string,
  locale?: string,
): { file?: string; src: string } {
  const suffix = (locale || process.env.MAIL_LOCALE || 'he')
    .toLowerCase()
    .startsWith('he')
    ? 'he'
    : 'en';

  const candidates: string[] = [];
  for (const dir of TEMPLATE_DIRS) {
    candidates.push(path.join(dir, `${name}.${suffix}.mjml`)); // locale-specific
    candidates.push(path.join(dir, `${name}.mjml`)); // generic
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return { file: p, src: fs.readFileSync(p, 'utf8') };
    }
  }
  return { src: '' };
}

const compileCache = new Map<string, TemplateDelegate>();

export async function render(
  name: string,
  data: Record<string, any>,
): Promise<RenderOut> {
  const { file, src } = findTemplate(name, data?.locale);
  if (!src) return { html: '', text: '' };

  const cacheKey = file || `inline:${name}`;
  let tpl = compileCache.get(cacheKey);
  if (!tpl) {
    tpl = Handlebars.compile(src, { noEscape: true });
    compileCache.set(cacheKey, tpl);
  }

  const mjml = tpl(data);

  const { html /*, errors*/ } = mjml2html(mjml, {
    validationLevel: 'soft',
    filePath: file ? path.dirname(file) : undefined, // so <mj-include> resolves
  });

  return { html, text: stripHtml(html) };
}

export const subjects = {
  subjectFor(tpl: string, _locale: string | undefined, data: any) {
    const brand = data?.brandName || 'Shop';
    switch (tpl) {
      case 'order_shipped':
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
  },
};
