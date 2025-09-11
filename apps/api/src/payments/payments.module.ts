import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [ConfigModule], // for ConfigService used in the controller
  controllers: [PaymentsController],
})
export class PaymentsModule {}
