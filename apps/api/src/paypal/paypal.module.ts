import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayPalPaymentsService } from '../orders/services/paypal-payments.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [PayPalPaymentsService],
  exports: [PayPalPaymentsService],
})
export class PayPalModule {}
