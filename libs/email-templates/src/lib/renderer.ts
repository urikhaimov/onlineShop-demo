// libs/email-templates/src/renderer.ts
import fs from 'node:fs';
import path from 'node:path';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { registerEmailHelpers } from './helpers';

registerEmailHelpers(Handlebars); // ✅ ensure helpers are on this instance

export type EmailLang = 'en' | 'he';

export interface RenderOpts {
  template:
    | 'order-confirmed'
    | 'payment-receipt'
    | 'password-reset'
    | 'order-shipped'
    | 'order-delivered'
    | 'order-canceled';
  lang: EmailLang;
  data: Record<string, any>;
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function getTemplatesRoot(): string {
  const candidates = [
    // when called from a compiled API app (dist/apps/api/... importing dist/libs/email-templates/...)
    path.join(__dirname, '..', 'templates'),
    path.join(__dirname, 'templates'),
    // when the lib is built into dist/libs/...
    path.join(process.cwd(), 'dist', 'libs', 'email-templates', 'templates'),
    // when running ts-node / workspace dev
    path.join(process.cwd(), 'libs', 'email-templates', 'src', 'templates'),
  ];
  const found = firstExisting(candidates);
  if (!found) {
    throw new Error(
      '[email-templates] Could not find templates directory. Checked:\n' +
        candidates.join('\n'),
    );
  }
  return found;
}

function loadTemplate(name: string) {
  const root = getTemplatesRoot();

  // Support both dashed and underscored filenames (e.g., order-shipped ⟺ order_shipped)
  const nameVariants = Array.from(
    new Set([name, name.replace(/-/g, '_'), name.replace(/_/g, '-')]),
  );

  const basePath = path.join(root, 'base.mjml');
  if (!fs.existsSync(basePath)) {
    throw new Error(`[email-templates] Missing base.mjml in ${root}`);
  }
  const base = fs.readFileSync(basePath, 'utf8');

  const bodyPath =
    firstExisting(nameVariants.map((n) => path.join(root, `${n}.mjml`))) ?? '';
  if (!bodyPath) {
    throw new Error(
      `[email-templates] Missing template "${name}". Tried:\n` +
        nameVariants
          .map((n) => ` - ${path.join(root, `${n}.mjml`)}`)
          .join('\n'),
    );
  }
  const body = fs.readFileSync(bodyPath, 'utf8');

  return { base, body };
}

/** Keep your original API for internal calls if you like. */
export function renderEmail(opts: RenderOpts): string {
  const { base, body } = loadTemplate(opts.template);
  const merged = base.replace('<!-- ::BODY:: -->', body);

  const hb = Handlebars.compile(merged, { noEscape: true });
  const dir = opts.lang === 'he' ? 'rtl' : 'ltr';
  const ctx = {
    ...opts.data,
    lang: opts.lang,
    dir,
    isHebrew: opts.lang === 'he',
    alignStart: dir === 'rtl' ? 'right' : 'left',
    alignEnd: dir === 'rtl' ? 'left' : 'right',
    year: opts.data?.year ?? new Date().getFullYear(),
  };

  const mjml = hb(ctx);
  const { html } = mjml2html(mjml, {
    validationLevel: 'soft',
    keepComments: false,
    minify: true,
  });
  return html;
}

/**
 * ✅ This is the function MailerService looks for.
 * It returns { html, text } and takes (templateName, vars).
 */
export async function render(templateName: RenderOpts['template'], vars: any) {
  const loc = String(vars?.locale ?? vars?.lang ?? 'he').toLowerCase();
  const lang: EmailLang = loc.startsWith('he') ? 'he' : 'en';

  const html = renderEmail({ template: templateName, lang, data: vars || {} });

  // Lightweight text: strip tags & collapse whitespace
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return { html, text };
}
