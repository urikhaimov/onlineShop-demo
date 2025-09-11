import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { raw } from 'express';

@Module({
  // If ConfigModule is not global elsewhere, switch to ConfigModule.forRoot({ isGlobal: true })
  imports: [ConfigModule],
  controllers: [PaymentsController],
  providers: [
    // Stub mailer so the DI token exists; tests/prod can override/replace it
    { provide: 'MAIL_SERVICE', useValue: {} },
  ],
  exports: ['MAIL_SERVICE'],
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
