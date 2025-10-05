import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders.public.controller';
import { OrdersStripeWebhookController } from './orders.webhook.controller';

import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';

import { OrdersPricingService } from './services/orders-pricing.service';
import { StripePaymentsService } from './services/stripe-payments.service';
import { OrderNotificationsService } from './services/order-notifications.service';
import { OrdersQueriesService } from './services/orders-queries.service';
import { OrdersLifecycleService } from './services/orders-lifecycle.service';
import { OrdersDraftsService } from './services/orders-drafts.service';
import { OrdersPaymentFlowService } from './services/orders-payment-flow.service';
import { OrdersWebhookService } from './services/orders-webhook.service';

import { MailerModule } from '../mailer'; // ← use barrel export
import { InvoiceService } from '../invoice/invoice.service';

@Module({
  imports: [
    ConfigModule,
    MailerModule, // ← provides MailerService to OrderNotificationsService, etc.
  ],
  controllers: [
    OrdersController,
    OrdersPublicController,
    OrdersStripeWebhookController, // owns /webhooks/stripe and /orders/webhook
  ],
  providers: [
    // Facade
    OrdersService,

    // Repo + domain services
    OrdersRepository,
    OrdersPricingService,
    StripePaymentsService,
    OrderNotificationsService, // ← injects MailerService internally
    OrdersQueriesService,
    OrdersLifecycleService,
    OrdersDraftsService,
    OrdersPaymentFlowService,
    OrdersWebhookService,

    // Invoice provider (until moved to its own module)
    InvoiceService,
  ],
  exports: [
    OrdersService,
    // export others only if needed elsewhere
  ],
})
export class OrdersModule {}
