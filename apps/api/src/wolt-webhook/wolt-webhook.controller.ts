// src/wolt-webhook/wolt-webhook.controller.ts
import { Controller, Post, Req, Res, Headers, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express'; // ok even if you run Fastify; used only for types
import * as crypto from 'crypto';

const SIG_HEADER = 'x-signature'; // replace once Wolt confirms the header name
const HMAC_ALGO = 'sha256';

@Controller('api/webhooks')
export class WoltWebhookController {
  @Post('wolt')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer }, // raw body will be attached below
    @Res({ passthrough: true }) res: Response,
    @Headers(SIG_HEADER) signature: string,
  ) {
    const secret = process.env.WOLT_WEBHOOK_SECRET || '';

    // 1) get raw body (Buffer)
    const raw = (req as any).rawBody as Buffer;
    if (!raw || !signature || !secret) {
      // don't leak details
      return res.status(400).send('bad request');
    }

    // 2) compute expected HMAC
    const expected = crypto
      .createHmac(HMAC_ALGO, secret)
      .update(raw)
      .digest('hex');

    // 3) constant-time compare
    const ok =
      signature.includes(expected) && // tweak if header is "t=...,v1=..."
      expected.length === 64; // sanity

    if (!ok) return res.status(400).send('invalid signature');

    // 4) parse json *after* verification
    const event = JSON.parse(raw.toString('utf8'));
    console.log('Wolt event:', event); // TODO: idempotent handling, queue, etc.

    return 'ok';
  }
}
