// libs/mailer/src/mailer.module.ts
import { Global, Module } from '@nestjs/common';
import { MailerService, MAILER_CONFIG, MAIL_TRANSPORT } from './mailer.service';
import { loadMailerConfig } from './mailer.config';
import { TemplateRenderer } from './templates/renderer';
import { SendgridTransport } from './transports/sendgrid.transport';
import { SmtpTransport } from './transports/smtp.transport';
import { JsonTransport } from './transports/json.transport';

@Global()
@Module({
  providers: [
    // normalized config
    {
      provide: MAILER_CONFIG,
      useFactory: () => loadMailerConfig(),
    },
    // renderer
    {
      provide: TemplateRenderer,
      inject: [MAILER_CONFIG],
      useFactory: (cfg: ReturnType<typeof loadMailerConfig>) =>
        new TemplateRenderer(cfg.brandName),
    },
    // transport factory
    {
      provide: MAIL_TRANSPORT,
      inject: [MAILER_CONFIG],
      useFactory: (cfg: ReturnType<typeof loadMailerConfig>) => {
        if (cfg.provider === 'sendgrid' && cfg.sendgrid?.apiKey)
          return new SendgridTransport(cfg);
        if (cfg.provider === 'smtp') return new SmtpTransport(cfg);
        return new JsonTransport();
      },
    },
    MailerService,
  ],
  exports: [MailerService],
})
export class MailerModule {}
