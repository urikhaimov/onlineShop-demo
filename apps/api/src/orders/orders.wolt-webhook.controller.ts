import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  Logger,
  Headers,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { OrdersRepository } from './repositories/orders.repository';
import { nowIso } from './utils/orders.helpers';

// Wolt webhook signature header: "t=<timestamp>,v1=<hex_sig>"
function verifyWoltSignature(
  secret: string,
  rawBody: Buffer,
  signatureHeader: string,
): boolean {
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => p.split('=')),
  );
  const timestamp = parts['t'];
  const receivedSig = parts['v1'];
  if (!timestamp || !receivedSig) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig));
  } catch {
    return false;
  }
}

@Controller()
export class OrdersWoltWebhookController {
  private readonly logger = new Logger(OrdersWoltWebhookController.name);

  constructor(private readonly repo: OrdersRepository) {}

  @Post('webhooks/wolt')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('wolt-signature') woltSignature: string,
  ) {
    const rawBody =
      req.rawBody ??
      (Buffer.isBuffer(req.body) ? (req.body as Buffer) : undefined);

    const secret = process.env['WOLT_WEBHOOK_SECRET'] ?? '';

    if (secret) {
      const body = rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
      if (!verifyWoltSignature(secret, body, woltSignature ?? '')) {
        this.logger.warn('[Wolt] Webhook signature mismatch');
        return res.status(400).send('Invalid signature');
      }
    }

    const event: {
      type?: string;
      data?: {
        id?: string;
        merchant_order_reference_id?: string;
        status?: string;
        tracking?: { url?: string };
        estimated_dropoff_time?: string;
      };
    } = req.body ?? {};

    const { type, data } = event;
    const orderId = data?.merchant_order_reference_id;

    this.logger.log(`[Wolt] ${type} for order ${orderId ?? 'unknown'}`);

    if (orderId && data?.id) {
      try {
        await this.repo.saveOrderMerge(orderId, {
          delivery: {
            provider: 'wolt',
            trackingNumber: data.id,
            ...(data.tracking?.url ? { trackingUrl: data.tracking.url } : {}),
            ...(data.estimated_dropoff_time
              ? { eta: data.estimated_dropoff_time }
              : {}),
            status: data.status,
          },
          updatedAt: nowIso(),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`[Wolt] Failed to update order ${orderId}: ${msg}`);
      }
    }

    return res.json({ received: true });
  }
}
