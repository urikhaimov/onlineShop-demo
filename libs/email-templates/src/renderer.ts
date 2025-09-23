import * as fs from 'fs';
import * as path from 'path';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { registerEmailHelpers } from './helpers';

registerEmailHelpers();

export type EmailLang = 'en' | 'he';

export interface RenderOpts {
  template: 'order-confirmed' | 'payment-receipt' | 'password-reset';
  lang: EmailLang;
  data: Record<string, any>;
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
}

function getTemplatesRoot(): string {
  const candidates = [
    // When running inside API dist (webpack), __dirname ≈ dist/apps/api
    path.join(__dirname, 'libs', 'email-templates', 'templates'),
    // If the lib was compiled separately
    path.join(__dirname, 'templates'),
    path.join(__dirname, '..', 'templates'),
    // ts-node / dev from workspace root
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
  const base = fs.readFileSync(path.join(root, 'base.mjml'), 'utf8');
  const body = fs.readFileSync(path.join(root, `${name}.mjml`), 'utf8');
  return { base, body };
}

export function renderEmail(opts: RenderOpts) {
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
  const { html, errors } = mjml2html(mjml, {
    validationLevel: 'soft',
    keepComments: false,
    minify: true,
  });
  if (errors?.length) {
    // eslint-disable-next-line no-console
    console.warn('[email-templates] mjml warnings:', errors);
  }
  return html;
}
