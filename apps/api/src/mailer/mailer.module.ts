import { Module } from '@nestjs/common';
import { MailerService } from './mailer.service';

@Module({
  providers: [
    {
      provide: 'MAIL_SERVICE',
      useFactory: () => new MailerService(),
    },
  ],
  exports: ['MAIL_SERVICE'],
})
export class MailerModule {}
