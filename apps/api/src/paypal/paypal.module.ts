import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayPalPaymentsService } from '../orders/services/paypal-payments.service';

@Module({
  imports: [ConfigModule],
  providers: [PayPalPaymentsService],
  exports: [PayPalPaymentsService],
})
export class PayPalModule {}
