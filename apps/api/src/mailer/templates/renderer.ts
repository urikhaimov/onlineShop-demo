// libs/mailer/src/templates/renderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { registerEmailHelpers } from '@email-templates';
import { loadTemplateSource } from './paths';
import { subjectFor } from './subjects';

// Register Handlebars helpers (formatDate, price, eq, etc.) once at module load.
registerEmailHelpers(Handlebars);

export type RenderOut =
  | { ok: true; subject: string; html: string; text: string }
  | { ok: false };

const cache = new Map<string, Handlebars.TemplateDelegate>();

function stripHtml(html: string) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Wrap a fragment template into base.mjml; if it's already a full <mjml> doc, return as-is. */
function composeFullMjml(src: string, locale?: string): string {
  if (/<mjml[\s>]/i.test(src)) return src;
  const base = loadTemplateSource('base', locale);
  if (!base.src) return src;
  if (base.src.includes('<!-- ::BODY:: -->')) {
    return base.src.replace('<!-- ::BODY:: -->', src);
  }
  return base.src.replace(
    /<mj-wrapper([^>]*)>([\s\S]*?)<\/mj-wrapper>/,
    `<mj-wrapper$1>${src}</mj-wrapper>`,
  );
}

export class TemplateRenderer {
  constructor(private readonly brandName: string) {}

  async render(
    name: string,
    locale: string | undefined,
    vars: any,
    fallbackSubject: string,
  ): Promise<RenderOut> {
    const { file, src } = loadTemplateSource(name, locale);
    if (!src) return { ok: false };

    const composedSrc = composeFullMjml(src, locale);
    const key = file ? `${file}::composed` : `inline:${name}`;
    let tpl = cache.get(key);
    if (!tpl) {
      tpl = Handlebars.compile(composedSrc, { noEscape: true });
      cache.set(key, tpl);
    }

    const isRtl = (locale || 'he').toLowerCase().startsWith('he');
    const isHebrew = isRtl;
    const mjml = tpl({
      locale,
      dir: isRtl ? 'rtl' : 'ltr',
      isRtl,
      isHebrew,
      alignStart: isRtl ? 'right' : 'left',
      alignEnd: isRtl ? 'left' : 'right',
      year: new Date().getFullYear(),
      brandName: this.brandName,
      ...vars,
    });

    const { html } = mjml2html(mjml, {
      validationLevel: 'soft',
      filePath: file ? require('path').dirname(file) : undefined,
    });
    const plain = stripHtml(html);
    if (!html || plain.length < 30) return { ok: false };

    const subject = subjectFor(name, this.brandName, vars) || fallbackSubject;
    return { ok: true, subject, html, text: plain };
  }
}
