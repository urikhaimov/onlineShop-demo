// apps/api/src/payments/payments.module.ts
import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { raw } from 'express';

import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { MailerModule } from '../mailer/mailer.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { OrdersModule } from '../orders/orders.module'; // must export OrdersService

@Module({
  imports: [
    ConfigModule, // or ConfigModule.forRoot({ isGlobal: true }) in AppModule
    MailerModule,
    InvoiceModule,
    OrdersModule, // <-- required for StripeWebhookController's OrdersService
  ],
  controllers: [PaymentsController, StripeWebhookController],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Stripe needs the exact raw bytes for signature verification
    consumer
      .apply(raw({ type: '*/*' }))
      .forRoutes(
        { path: 'webhooks/stripe', method: RequestMethod.POST },
        { path: 'payments/webhooks/stripe', method: RequestMethod.POST },
        { path: 'payments/webhook', method: RequestMethod.POST },
        { path: 'stripe/webhook', method: RequestMethod.POST },
        { path: 'orders/webhook', method: RequestMethod.POST },
      );
  }
}
