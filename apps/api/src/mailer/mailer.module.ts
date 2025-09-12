// mailer.module.ts
import { Global, Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [
    MailerService,
    // Alias so consumers/tests can inject by token 'MAIL_SERVICE'
    { provide: 'MAIL_SERVICE', useExisting: MailerService },
  ],
  exports: [MailerService, 'MAIL_SERVICE'],
})
export class MailerModule {}
