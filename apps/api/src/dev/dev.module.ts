// src/dev/dev.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevController } from './dev.controller';
import { MailerModule } from '../mailer/mailer.module';

@Module({
  imports: [ConfigModule, MailerModule],
  controllers: [DevController],
})
export class DevModule {}
