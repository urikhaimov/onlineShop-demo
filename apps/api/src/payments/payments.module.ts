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
import { MailerModule } from '../mailer/mailer.module';
import { InvoiceModule } from '../invoice/invoice.module';

// NOTE:
// - Do NOT import OrdersModule here (avoids spinning up OrdersService in tests).
// - Do NOT import or register an InvoicesPublicController here.
//   The invoice download endpoint is implemented on PaymentsController.

@Module({
  // If ConfigModule isn’t global elsewhere, switch to ConfigModule.forRoot({ isGlobal: true })
  imports: [ConfigModule, MailerModule, InvoiceModule],
  controllers: [PaymentsController],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Stripe webhook must receive the exact raw bytes (no JSON parsing)
    consumer.apply(raw({ type: '*/*' })).forRoutes(
      // primary webhook endpoint
      { path: 'payments/webhooks/stripe', method: RequestMethod.POST },
      // optional legacy alias
      { path: 'payments/webhook', method: RequestMethod.POST },
    );
  }
}
