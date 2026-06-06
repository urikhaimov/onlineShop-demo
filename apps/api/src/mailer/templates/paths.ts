// libs/mailer/src/templates/paths.ts
import * as fs from 'fs';
import * as path from 'path';

const DIRS = [
  process.env.MAIL_TPL_DIR || '',
  path.join(
    process.cwd(),
    'libs',
    'email-templates',
    'src',
    'lib',
    'templates',
  ),
  path.join(
    process.cwd(),
    'dist',
    'libs',
    'email-templates',
    'src',
    'lib',
    'templates',
  ),
  path.join(process.cwd(), 'dist', 'libs', 'email-templates', 'templates'),
  path.join(__dirname, 'templates'),
  __dirname,
].filter(Boolean);

export function loadTemplateSource(name: string, locale?: string) {
  const suffix = (locale || process.env.MAIL_LOCALE || 'he')
    .toLowerCase()
    .startsWith('he')
    ? 'he'
    : 'en';
  const candidates: string[] = [];
  for (const d of DIRS) {
    candidates.push(path.join(d, `${name}.${suffix}.mjml`));
    candidates.push(path.join(d, `${name}.mjml`));
  }
  for (const p of candidates)
    if (fs.existsSync(p)) return { file: p, src: fs.readFileSync(p, 'utf8') };
  // helpful once:
  console.warn(
    `[mailer][templates] "${name}" not found. searched:\n - ${candidates.join('\n - ')}`,
  );
  return { src: '' };
}
