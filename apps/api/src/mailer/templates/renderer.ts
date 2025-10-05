// libs/mailer/src/templates/renderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import { loadTemplateSource } from './paths';
import { subjectFor } from './subjects';

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

    const key = file || `inline:${name}`;
    let tpl = cache.get(key);
    if (!tpl) {
      tpl = Handlebars.compile(src, { noEscape: true });
      cache.set(key, tpl);
    }

    const isRtl = (locale || 'he').toLowerCase().startsWith('he');
    const mjml = tpl({
      locale,
      dir: isRtl ? 'rtl' : 'ltr',
      isRtl,
      alignStart: isRtl ? 'right' : 'left',
      alignEnd: isRtl ? 'left' : 'right',
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
