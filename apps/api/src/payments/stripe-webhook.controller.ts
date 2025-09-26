// apps/api/src/payments/stripe-webhook.controller.ts
import { Controller, Post, Req, Res, HttpCode, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { OrdersService } from '../orders/orders.service';

@Controller() // global "api" prefix is applied in main.ts
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly orders: OrdersService) {}

  // Canonical path (plus a few aliases for convenience / backwards compat)
  @Post([
    'webhooks/stripe',
    'payments/webhooks/stripe',
    'payments/webhook',
    'stripe/webhook',
    'orders/webhook',
  ])
  @HttpCode(200)
  async handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string | undefined;

      // Prefer req.rawBody (if you enabled a global capture), else the Buffer from express.raw()
      const rawPayload =
        (req as any).rawBody ??
        (Buffer.isBuffer((req as any).body) ? (req as any).body : undefined);

      // If Stripe gave a signature but we don't have the exact raw bytes, fail fast with a clear hint
      if (signature && !rawPayload) {
        this.logger.warn(
          'Stripe webhook received with signature but no raw body; ensure express.raw() or a rawBody capture is applied to this route.',
        );
        return res
          .status(400)
          .send('Webhook Error: raw body missing for signature verification');
      }

      const result = await this.orders.handleStripeWebhook(
        (rawPayload ?? Buffer.from(JSON.stringify(req.body ?? {}))) as any,
        signature,
      );

      return res.json(result ?? { received: true });
    } catch (err: any) {
      this.logger.warn(`Stripe webhook error: ${err?.message || String(err)}`);
      // Stripe expects a non-2xx on verification/parse errors
      return res
        .status(400)
        .send(`Webhook Error: ${err?.message || 'invalid'}`);
    }
  }
}
