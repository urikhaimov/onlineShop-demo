import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { raw } from 'express';
import { MailerModule } from '../mailer/mailer.module'; // path from src/payments -> src/mailer
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  // If ConfigModule isn’t global elsewhere, switch to ConfigModule.forRoot({ isGlobal: true })
  imports: [ConfigModule, MailerModule, InvoiceModule],
  controllers: [PaymentsController],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Stripe webhook must receive the exact raw bytes (no JSON parsing)
    consumer.apply(raw({ type: '*/*' })).forRoutes(
      // ✅ must match @Post('webhooks/stripe') in PaymentsController
      { path: 'payments/webhooks/stripe', method: RequestMethod.POST },

      // (optional) legacy alias if you previously used /payments/webhook
      { path: 'payments/webhook', method: RequestMethod.POST },
    );
  }
}
