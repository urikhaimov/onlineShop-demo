import { Controller, Post, Req, Res, HttpCode, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RawBodyRequest } from '@nestjs/common/interfaces';
import { OrdersService } from './orders.service';

@Controller() // will inherit your global prefix, e.g. /api
export class OrdersStripeWebhookController {
  private readonly logger = new Logger(OrdersStripeWebhookController.name);

  constructor(private readonly orders: OrdersService) {}

  // Canonical + a couple of aliases for backwards compat
  @Post(['webhooks/stripe', 'orders/webhook'])
  @HttpCode(200)
  async handle(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string | undefined;

      // Prefer req.rawBody (if captured globally) or Buffer from express.raw()
      const rawPayload =
        (req as any).rawBody ??
        (Buffer.isBuffer((req as any).body) ? (req as any).body : undefined);

      if (signature && !rawPayload) {
        this.logger.warn(
          'Stripe webhook signed but no raw body present; ensure express.raw() is applied.',
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
      return res
        .status(400)
        .send(`Webhook Error: ${err?.message || 'invalid'}`);
    }
  }
}
