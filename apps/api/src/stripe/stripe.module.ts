import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  // Import ConfigModule so StripeService can inject ConfigService
  imports: [ConfigModule],
  controllers: [StripeController],
  providers: [StripeService],
  // Export only if other modules need the service
  exports: [StripeService],
})
export class StripeModule {}
