import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders.public.controller';
import { OrdersPayPalWebhookController } from './orders.webhook.controller';

import { OrdersService } from './orders.service';
import { OrdersRepository } from './repositories/orders.repository';

import { OrdersPricingService } from './services/orders-pricing.service';
import { PayPalPaymentsService } from './services/paypal-payments.service';
import { OrderNotificationsService } from './services/order-notifications.service';
import { OrdersQueriesService } from './services/orders-queries.service';
import { OrdersLifecycleService } from './services/orders-lifecycle.service';
import { OrdersDraftsService } from './services/orders-drafts.service';
import { OrdersPaymentFlowService } from './services/orders-payment-flow.service';
import { OrdersWebhookService } from './services/orders-webhook.service';

import { MailerModule } from '../mailer';
import { InvoiceService } from '../invoice/invoice.service';

@Module({
  imports: [ConfigModule, MailerModule],
  controllers: [
    OrdersController,
    OrdersPublicController,
    OrdersPayPalWebhookController,
  ],
  providers: [
    OrdersService,
    OrdersRepository,
    OrdersPricingService,
    PayPalPaymentsService,
    OrderNotificationsService,
    OrdersQueriesService,
    OrdersLifecycleService,
    OrdersDraftsService,
    OrdersPaymentFlowService,
    OrdersWebhookService,
    InvoiceService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
