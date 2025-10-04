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

import { MailerModule } from '../mailer/mailer.module';
import { InvoiceService } from '../invoice/invoice.service';

// If not global / not imported via AuthModule, uncomment:
// import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [ConfigModule, MailerModule],
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
    OrderNotificationsService,
    OrdersQueriesService,
    OrdersLifecycleService,
    OrdersDraftsService,
    OrdersPaymentFlowService,
    OrdersWebhookService,

    // Invoice provider (until moved to its own module)
    InvoiceService,

    // If not using global guards / AuthModule:
    // FirebaseAuthGuard,
    // RolesGuard,
  ],
  // Export more if other modules use them:
  exports: [
    OrdersService,
    // OrdersRepository,
    // OrdersPricingService,
    // OrdersPaymentFlowService,
    // OrdersQueriesService,
  ],
})
export class OrdersModule {}
