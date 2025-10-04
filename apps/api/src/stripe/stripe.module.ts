// apps/api/src/stripe/stripe.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripePaymentsService } from '../orders/services/stripe-payments.service';

@Module({
  imports: [ConfigModule], // ✅ so ConfigService is available
  providers: [StripePaymentsService],
  exports: [StripePaymentsService],
})
export class StripeModule {}
