// libs/mailer/src/mailer.config.ts
import type { MailerConfig, Provider } from './mailer.types';

export function loadMailerConfig(): MailerConfig {
  const env = process.env;

  // Env compatibility (your earlier names)
  const providerEnv =
    (env.EMAIL_PROVIDER as Provider) ||
    (env.MAIL_PROVIDER as Provider) ||
    ('smtp' as Provider);

  const parsedFrom = (env.EMAIL_FROM || '').match(/(.*)<(.+)>/);
  const compatFrom = parsedFrom ? parsedFrom[2].trim() : env.EMAIL_FROM;
  const compatName = parsedFrom ? parsedFrom[1].trim() : undefined;

  const from = env.MAIL_FROM || compatFrom || 'no-reply@example.com';
  const name = env.MAIL_FROM_NAME || compatName || 'Shop';

  const provider: Provider =
    providerEnv === 'sendgrid' && !env.SENDGRID_API_KEY ? 'json' : providerEnv;

  return {
    provider,
    fromAddress: name ? `${name} <${from}>` : from,
    sandbox: String(env.SENDGRID_SANDBOX ?? '').toLowerCase() === 'true',
    smtp: {
      url: env.SMTP_URL,
      host: env.SMTP_HOST || env.EMAIL_HOST,
      port: env.SMTP_PORT
        ? Number(env.SMTP_PORT)
        : env.EMAIL_PORT
          ? Number(env.EMAIL_PORT)
          : undefined,
      secure:
        String(env.SMTP_SECURE ?? '').toLowerCase() === 'true' ||
        env.SMTP_PORT === '465' ||
        env.EMAIL_PORT === '465',
      user: env.SMTP_USER || env.EMAIL_USER,
      pass: env.SMTP_PASS || env.EMAIL_PASS,
    },
    sendgrid: env.SENDGRID_API_KEY
      ? { apiKey: env.SENDGRID_API_KEY }
      : undefined,
    brandName: env.MAIL_BRAND_NAME || 'Shop',
    publicBaseUrl: env.PUBLIC_BASE_URL || '',
    assetsBaseUrl: env.MAIL_ASSETS_URL || '',
    defaultLocale: env.MAIL_LOCALE?.toLowerCase().startsWith('he')
      ? 'he'
      : 'en',
  };
}
