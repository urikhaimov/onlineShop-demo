import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  Logger,
  Headers,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service';

@Controller()
export class OrdersPayPalWebhookController {
  private readonly logger = new Logger(OrdersPayPalWebhookController.name);

  constructor(private readonly orders: OrdersService) {}

  @Post(['webhooks/paypal', 'orders/webhook'])
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
    @Headers('paypal-auth-algo') authAlgo: string,
    @Headers('paypal-cert-url') certUrl: string,
    @Headers('paypal-transmission-id') transmissionId: string,
    @Headers('paypal-transmission-sig') transmissionSig: string,
    @Headers('paypal-transmission-time') transmissionTime: string,
  ) {
    try {
      const rawPayload =
        (req as Request & { rawBody?: Buffer }).rawBody ??
        (Buffer.isBuffer((req as Request & { body: unknown }).body)
          ? ((req as Request & { body: unknown }).body as Buffer)
          : undefined);

      const body = rawPayload ?? Buffer.from(JSON.stringify(req.body ?? {}));

      const result = await this.orders.handlePayPalWebhook(body, {
        authAlgo,
        certUrl,
        transmissionId,
        transmissionSig,
        transmissionTime,
      });

      return res.json(result ?? { received: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PayPal webhook error: ${msg}`);
      return res.status(400).send(`Webhook Error: ${msg || 'invalid'}`);
    }
  }
}
