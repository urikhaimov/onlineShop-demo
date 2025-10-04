import { Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
  buildIdemKey,
  isIdempotencyParamMismatch,
} from '../utils/orders.helpers';

type PMTypes = Stripe.PaymentIntentCreateParams['payment_method_types'];
type ShippingParam = Stripe.PaymentIntentUpdateParams['shipping'];

@Injectable()
export class StripePaymentsService {
  private readonly logger = new Logger(StripePaymentsService.name);
  private readonly stripe: Stripe;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    const key =
      this.config?.get<string>('STRIPE_SECRET_KEY') ||
      process.env.STRIPE_SECRET_KEY ||
      '';
    if (!key) throw new Error('Missing STRIPE_SECRET_KEY in environment');

    this.stripe = new Stripe(key, {
      apiVersion: '2024-06-20' as Stripe.StripeConfig['apiVersion'],
    });
  }

  async createPaymentIntent(opts: {
    userId: string;
    orderId?: string;
    amountMinor: number;
    currency: string;
    metadata?: Record<string, string>;
    email?: string;
    idempotencyKey?: string;
    reuseIfSame?: boolean;
    paymentMethodTypes?: PMTypes;
  }): Promise<Stripe.PaymentIntent> {
    const baseKey = buildIdemKey({
      provided: opts.idempotencyKey,
      userId: opts.userId,
      orderId: opts.orderId,
      amount: opts.amountMinor,
      currency: opts.currency,
    });

    const idemKey =
      opts.reuseIfSame === true
        ? baseKey
        : `${baseKey}:${Date.now().toString(36)}:${Math.random()
            .toString(36)
            .slice(2, 7)}`.slice(0, 255);

    const params: Stripe.PaymentIntentCreateParams = {
      amount: opts.amountMinor,
      currency: opts.currency,
      payment_method_types: (opts.paymentMethodTypes ?? ['card']) as PMTypes,
      payment_method_options: { card: { request_three_d_secure: 'automatic' } },
      metadata: opts.metadata,
      receipt_email: opts.email || undefined,
    };

    const tryCreate = (idk: string) =>
      this.stripe.paymentIntents.create(params, {
        idempotencyKey: idk,
      }) as unknown as Promise<Stripe.PaymentIntent>;

    try {
      return await tryCreate(idemKey);
    } catch (e) {
      if (!isIdempotencyParamMismatch(e)) throw e;
      const salted = `${idemKey}:${Date.now().toString(36)}`.slice(0, 255);
      this.logger.warn(`retrying PI create with salted key (was=${idemKey})`);
      return await tryCreate(salted);
    }
  }

  retrieve(
    paymentIntentId: string,
    expand: string[] = ['latest_charge'],
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId, {
      expand,
    }) as unknown as Promise<Stripe.PaymentIntent>;
  }

  confirm(
    paymentIntentId: string,
    input: { paymentMethodId?: string; returnUrl?: string },
  ): Promise<Stripe.PaymentIntent> {
    const confirmParams: Stripe.PaymentIntentConfirmParams = {};
    if (input.paymentMethodId)
      confirmParams.payment_method = input.paymentMethodId;
    if (input.returnUrl) confirmParams.return_url = input.returnUrl;
    return this.stripe.paymentIntents.confirm(
      paymentIntentId,
      confirmParams,
    ) as unknown as Promise<Stripe.PaymentIntent>;
  }

  updateShipping(
    paymentIntentId: string,
    shipping: ShippingParam,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.update(paymentIntentId, {
      shipping,
    }) as unknown as Promise<Stripe.PaymentIntent>;
  }

  cancel(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(
      paymentIntentId,
    ) as unknown as Promise<Stripe.PaymentIntent>;
  }

  constructEvent(
    raw: string | Buffer,
    signature: string | undefined,
    secret: string,
  ) {
    return this.stripe.webhooks.constructEvent(raw as any, signature!, secret);
  }
}
