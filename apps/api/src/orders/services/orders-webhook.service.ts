import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { StripePaymentsService } from './stripe-payments.service';
import { OrdersPaymentFlowService } from './orders-payment-flow.service';
import { OrdersLifecycleService } from './orders-lifecycle.service';

@Injectable()
export class OrdersWebhookService {
  private readonly logger = new Logger(OrdersWebhookService.name);
  constructor(
    private readonly config: ConfigService,
    private readonly stripeSvc: StripePaymentsService,
    private readonly payments: OrdersPaymentFlowService,
    private readonly lifecycle: OrdersLifecycleService,
  ) {}

  async handleStripeWebhook(rawBody: string | Buffer, signature?: string) {
    const secret =
      this.config.get<string>('STRIPE_WEBHOOK_SECRET') ??
      process.env.STRIPE_WEBHOOK_SECRET ??
      '';
    let event: Stripe.Event;

    try {
      if (secret && signature) {
        event = this.stripeSvc.constructEvent(rawBody, signature, secret);
      } else {
        const raw =
          typeof rawBody === 'string' ? rawBody : rawBody?.toString('utf8');
        event = JSON.parse(raw || '{}') as Stripe.Event;
      }
    } catch (e: any) {
      this.logger.warn(`Webhook verify/parse failed: ${e?.message || e}`);
      throw e;
    }

    this.logger.log(`handleStripeWebhook: ${event.type}`);

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const userId = (pi.metadata?.userId as string) || 'unknown';
      const orderId = (pi.metadata?.orderId as string | undefined) ?? pi.id;

      await this.payments.createOrderFromIntentById(pi.id, userId);
      if (orderId !== pi.id) await this.lifecycle.updateStatus(orderId, 'paid');
      return { received: true };
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId =
        (session.metadata?.orderId as string | undefined) ?? undefined;
      if (orderId) await this.lifecycle.updateStatus(orderId, 'paid');
      else if (typeof session.payment_intent === 'string') {
        await this.lifecycle.markPaidByPaymentIntentId(session.payment_intent);
      }
      return { received: true };
    }

    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as Stripe.Charge;
      const oid = (charge.metadata?.orderId as string | undefined) ?? undefined;
      if (oid) await this.lifecycle.updateStatus(oid, 'paid');
      return { received: true };
    }

    return { received: true };
  }
}
