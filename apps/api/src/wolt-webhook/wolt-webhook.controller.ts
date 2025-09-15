import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

const HMAC_ALGO = 'sha256';

function parseV1(sig?: string): string | undefined {
  if (!sig) return undefined;
  if (sig.includes('=')) {
    // format: t=...,v1=...,v1=...
    const v1 = sig
      .split(',')
      .map((s) => s.trim())
      .find((p) => p.startsWith('v1='));
    return v1?.slice(3);
  }
  return sig; // raw hex
}

@Controller('webhooks') // global prefix (e.g. "api") will be applied by the app
export class WoltWebhookController {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get<string>('WOLT_WEBHOOK_SECRET') ??
      process.env.WOLT_WEBHOOK_SECRET ??
      '';
  }

  @Post('wolt')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-signature') sigLower?: string,
    @Headers('X-Signature') sigTitle?: string,
  ) {
    const raw: Buffer | undefined =
      (req as any).rawBody ||
      (Buffer.isBuffer((req as any).body)
        ? ((req as any).body as Buffer)
        : undefined);

    const header =
      sigLower ?? sigTitle ?? (req.headers['x-signature'] as string);
    const v1Hex = parseV1(header);

    if (!raw || !v1Hex || !this.secret) {
      throw new BadRequestException('bad request');
    }

    // Compute expected HMAC as bytes and compare in constant time.
    let ok = false;
    try {
      const expected = crypto
        .createHmac(HMAC_ALGO, this.secret)
        .update(raw)
        .digest(); // Buffer
      const provided = Buffer.from(v1Hex, 'hex');
      ok =
        provided.length === expected.length &&
        crypto.timingSafeEqual(expected, provided);
    } catch {
      ok = false;
    }

    if (!ok) {
      throw new BadRequestException('invalid signature');
    }

    // If you need the event later:
    // const event = JSON.parse(raw.toString('utf8'));

    return { ok: true };
  }
}
