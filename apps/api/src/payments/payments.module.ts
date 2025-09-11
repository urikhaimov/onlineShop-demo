import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { raw } from 'express';
import { MailerModule } from '../mailer/mailer.module'; // ⬅ adjust path if needed

@Module({
  // If ConfigModule is not global elsewhere, switch to ConfigModule.forRoot({ isGlobal: true })
  imports: [ConfigModule, MailerModule],
  controllers: [PaymentsController],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Stripe webhook must receive the exact raw bytes (no JSON parsing)
    consumer.apply(raw({ type: 'application/json' })).forRoutes(
      // ✅ must match @Post('webhooks/stripe') in PaymentsController
      { path: 'payments/webhooks/stripe', method: RequestMethod.POST },

      // (optional) keep an alias if you previously called /payments/webhook
      { path: 'payments/webhook', method: RequestMethod.POST },
    );
  }
}
